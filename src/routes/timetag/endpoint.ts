import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import { SQLNoResultError, fetchFullTimetag, fetchTimetagRules, fetchTimetags } from '../../utils/fetchfunctions'
import { error } from '../../utils/common'
import { ETimetagWeekday } from '../../utils/timetagweekdays'
import log from '../../utils/logger'
import { escape, sql, unsafe } from '../../utils/database'

type ApiTimetag     = ApiDataTypes.Objects.Timetag
type ApiTimetagRule = ApiDataTypes.Objects.TimetagRule

const router = express.Router()

const ONE_DAY_SECONDS = 24 * 60 * 60


router.get('/', async (req: Request, res: Response) =>
{
    const token = res.locals.accessToken!

    res.send(Array.from((await fetchTimetags(
        token.getPayloadField('cid')
    )).values()))
})

router.post('/', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const companyId = token.getPayloadField('cid')

    const timetagProps: (keyof ApiTimetag)[] = [
        'Name',
        'BasisAmount',
        'BasisType',
    ]

    const ruleProps: (keyof ApiTimetagRule)[] = [
        'Name',
        'Type',
        'FromTime',
        'ToTime',
        'Amount',
        'Weekdays',
    ]

    const timetag: Partial<ApiTimetag> = {
        CompanyId: companyId,
    }
    const rules: ApiTimetagRule[] = []


    for(const field of timetagProps)
    {
        if(!(field in req.body) || req.body[field] === null)
            return error(res, 400, `Param "${field}" is required.`)

        const value = req.body[field] as string
        switch(field)
        {
            case 'Name':
            case 'BasisType':
                if(!value.length)
                    return error(res, 400, `Param "${field}" is invalid (must be a non-empty string).`)
                timetag[field] = value
                break

            case 'BasisAmount':
                timetag[field] = Number.parseFloat(value)
                if(Number.isNaN(timetag[field]) || !Number.isFinite(timetag[field]))
                    return error(res, 400, `Param "${field}" is invalid (must be a valid floating point number).`)
                break
        }
    }

    if('Rules' in req.body)
    {
        if(!Array.isArray(req.body.Rules))
            return error(res, 400, `Param "${rules}" is missing or invalid (must be an array of rule objets).`)

        for(const [ ruleIndex, rawRule ] of Object.entries<Partial<ApiTimetagRule>>(req.body.Rules))
        {
            const rule: Partial<ApiTimetagRule> = {
                CompanyId: companyId,
                Weekdays:  [],
            }

            // In case the the client passes the old definitions then we just use those
            if('From' in rawRule && rawRule.From !== null)
                rawRule.FromTime = rawRule.From as number

            if('To' in rawRule && rawRule.To !== null)
                rawRule.ToTime = rawRule.To as number

            for(const field of ruleProps)
            {
                if(!(field in rawRule) || rawRule[field] === null)
                    return error(res, 400, `Param "Rules[${ruleIndex}].${field}" is required.`)

                const value = rawRule[field] as string
                switch(field)
                {
                    case 'Name':
                    case 'Type':
                        if(!value.length)
                            return error(res, 400, `Param "Rules[${ruleIndex}].${field}" is invalid (must be a non-empty string).`)
                        rule[field] = value
                        break

                    case 'FromTime':
                    case 'ToTime':
                        rule[field] = Number.parseInt(value)
                        if(Number.isNaN(rule[field]))
                            return error(res, 400, `Param "Rules[${ruleIndex}].${field}" is invalid (must be an integer denoting seconds passed since midnight).`)
                        if(rule[field]! < 0 || rule[field]! > ONE_DAY_SECONDS)
                            return error(res, 400, `Param "Rules[${ruleIndex}].${field}" is invalid (must be between 0 and ${ONE_DAY_SECONDS}, both inclusive).`)
                        break

                    case 'Amount':
                        rule[field] = Number.parseFloat(value)
                        if(Number.isNaN(rule[field]) || !Number.isFinite(rule[field]))
                            return error(res, 400, `Param "Rules[${ruleIndex}].${field}" is invalid (must be a valid floating point number).`)
                        break

                    case 'Weekdays':
                        if(!Array.isArray(value))
                            return error(res, 400, `Param "Rules[${ruleIndex}].${field}" is invalid (must be an array of strings).`)
                        for(const weekday of value)
                        {
                            if(!(weekday in ETimetagWeekday))
                                return error(res, 400, `Param "Rules[${ruleIndex}].${field}" is invalid (must be one of: "${Object.values(ETimetagWeekday).join('", "')}")`)

                            if(rule[field]!.includes(weekday))
                                continue

                            rule[field]!.push(weekday)
                        }
                        break
                }
            }

            if(rules.some(r => r.Name == rule.Name))
                return error(res, 400, `Param "Rules[${ruleIndex}].Name" is invalid (names must be unique per timetag).`)

            rules.push(rule as ApiTimetagRule)
        }
    }


    const permissionChecks = new Map<string, string>()
    
    permissionChecks.set('Name', /*SQL*/`(
        SELECT
            COUNT(Name) = 0
        FROM
            timetags
        WHERE
            CompanyId = ${escape(companyId)}
            AND Name = ${escape(timetag.Name)}
    ) AS Name `)

    if(permissionChecks.size)
    {
        const result = await sql`SELECT ${unsafe(Array.from(permissionChecks.values()).join(','))}`

        for(const prop of permissionChecks.keys())
        {
            if(result[0][prop] !== 1)
                return error(res, 400, `Param "${prop}" is invalid.`)
        }
    }


    const result = await sql`
        INSERT INTO
            timetags
        SET
            CompanyId   = ${timetag.CompanyId},
            Name        = ${timetag.Name},
            BasisType   = ${timetag.BasisType},
            BasisAmount = ${timetag.BasisAmount}`

    const timetagId = result.insertId
    
    if(rules.length)
    {
        const insertRules: string[] = []
        for(const rule of rules)
        {
            insertRules.push(`(${[
                escape(companyId),
                escape(timetagId),
                escape(rule.Name),
                escape(rule.Type),
                escape(rule.FromTime),
                escape(rule.ToTime),
                escape(rule.Amount),
            ].join(',')})`)
        }

        // MySQL locks the table when inserting.
        // This means that the inserted rows are guaranteed to have sequential IDs in the same order as given.
        const result = await sql`
            INSERT INTO
                timetag_rules
                (CompanyId, TimeTagId, Name, Type, FromTime, ToTime, Amount)
            VALUES
                ${unsafe(insertRules.join(','))}`

        // This is important, because I can calculate and apply the IDs of the every inserted row like this:
        for(let i = result.insertId; i < result.insertId + result.affectedRows; i++)
            rules[i - result.insertId].Id = i

        const insertWeekdays: string[] = []
        for(const rule of rules)
        {
            for(const weekday of rule.Weekdays)
                insertWeekdays.push(`(${escape(rule.Id)},${escape(weekday)})`)
        }

        await sql`
            INSERT INTO
                x_timetag_rule_weekdays
                (TimeTagRuleId, Weekday)
            VALUES
                ${unsafe(insertWeekdays.join(','))}`
    }

    res.status(201).send(await fetchFullTimetag(companyId, timetagId))
})

router.get('/:timeTagId', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const timetagId = Number.parseInt(req.params.timeTagId)

    if(Number.isNaN(timetagId))
        return error(res, 400, 'Invalid URL')

    const timetags = await fetchTimetags(
        token.getPayloadField('cid'),
        'Id',
        [timetagId],
    )

    if(!timetags.has(timetagId))
        return error(res, 404, 'Timetag not found')

    res.send(timetags.get(timetagId))
})

router.delete('/:timeTagId', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const companyId = token.getPayloadField('cid')
    const timetagId = Number.parseInt(req.params.timeTagId)

    if(Number.isNaN(timetagId))
        return error(res, 400, 'Invalid URL')

    try
    {
        const timetag = await fetchFullTimetag(companyId, timetagId)

        const result = await sql`
            DELETE FROM
                timetags
            WHERE
                CompanyId = ${companyId}
                AND Id = ${timetag.Id}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Failed to delete timetag')

        log.silly(`Timetag was deleted:\n${JSON.stringify(timetag, null, 2)}`)

        res.sendStatus(204)
    }
    catch(_error)
    {
        if(!(_error instanceof SQLNoResultError))
            throw _error

        error(res, 404, 'Timetag not found')
    }
})

router.get('/:timeTagId/rules', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const timetagId = Number.parseInt(req.params.timeTagId)

    if(Number.isNaN(timetagId))
        return error(res, 400, 'Invalid URL')

    res.send(Array.from((await fetchTimetagRules(
        token.getPayloadField('cid'),
        'TimeTagId',
        [timetagId],
    )).values()))
})

router.post('/:timeTagId/rules', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const companyId = token.getPayloadField('cid')
    const timetagId = Number.parseInt(req.params.timeTagId)

    if(Number.isNaN(timetagId))
        return error(res, 400, 'Invalid URL')

    const requiredProps: (keyof ApiTimetagRule)[] = [
        'Name',
        'Type',
        'FromTime',
        'ToTime',
        'Amount',
        'Weekdays',
    ]

    const rule: Partial<ApiTimetagRule> = {
        CompanyId: companyId,
        TimeTagId: timetagId,
        Weekdays:  [],
    }

    // In case the the client passes the old definitions then we just use those
    if('From' in req.body && req.body.From !== null)
        req.body.FromTime = req.body.From

    if('To' in req.body && req.body.To !== null)
        req.body.ToTime = req.body.To

    for(const field of requiredProps)
    {
        if(!(field in req.body) || req.body[field] === null)
            return error(res, 400, `Param "${field}" is required.`)

        const value = req.body[field] as string
        switch(field)
        {
            case 'Name':
            case 'Type':
                if(!value.length)
                    return error(res, 400, `Param "${field}" is invalid (must be a non-empty string).`)
                rule[field] = value
                break

            case 'FromTime':
            case 'ToTime':
                rule[field] = Number.parseInt(value)
                if(Number.isNaN(rule[field]))
                    return error(res, 400, `Param "${field}" is invalid (must be an integer denoting seconds passed since midnight).`)
                if(rule[field]! < 0 || rule[field]! > ONE_DAY_SECONDS)
                    return error(res, 400, `Param "${field}" is invalid (must be between 0 and ${ONE_DAY_SECONDS}, both inclusive).`)
                break

            case 'Amount':
                rule[field] = Number.parseFloat(value)
                if(Number.isNaN(rule[field]) || !Number.isFinite(rule[field]))
                    return error(res, 400, `Param "${field}" is invalid (must be a valid floating point number).`)
                break

            case 'Weekdays':
                if(!Array.isArray(value))
                    return error(res, 400, `Param "${field}" is invalid (must be an array of strings).`)
                for(const weekday of value)
                {
                    if(!(weekday in ETimetagWeekday))
                        return error(res, 400, `Param "${field}" is invalid (must be one of: "${Object.values(ETimetagWeekday).join('", "')}")`)

                    if(rule[field]!.includes(weekday))
                        continue

                    rule[field]!.push(weekday)
                }
                break
        }
    }

    const permissionChecks = new Map<string, string>()

    if(rule.Name)
    {
        permissionChecks.set('Name', /*SQL*/`(
            SELECT
                COUNT(ttr.Name) = 0
            FROM
                timetag_rules AS ttr
            WHERE
                ttr.CompanyId = ${escape(companyId)}
                AND ttr.timeTagId = ${escape(timetagId)}
                AND ttr.Name = ${escape(rule.Name)}
        ) AS Name `)
    }

    if(rule.TimeTagId)
    {
        permissionChecks.set('TimeTagId', /*SQL*/`(
            SELECT
                COUNT(tt.Id) = 1
            FROM
                timetags AS tt
            WHERE
                tt.CompanyId = ${escape(companyId)}
                AND tt.Id = ${escape(timetagId)}
        ) AS TimeTagId `)
    }

    if(permissionChecks.size)
    {
        const result = await sql`SELECT ${unsafe(Array.from(permissionChecks.values()).join(','))}`

        for(const prop of permissionChecks.keys())
        {
            if(result[0][prop] !== 1)
            {
                if(prop === 'TimeTagId')
                    return error(res, 404, 'Timetag not found')
                else
                    return error(res, 400, `Param "${prop}" is invalid.`)
            }
        }
    }

    const result = await sql`
        INSERT INTO
            timetag_rules
        SET
            CompanyId = ${rule.CompanyId},
            TimeTagId = ${rule.TimeTagId},
            Name      = ${rule.Name},
            Type      = ${rule.Type},
            FromTime  = ${rule.FromTime},
            ToTime    = ${rule.ToTime},
            Amount    = ${rule.Amount}`
    rule.Id = result.insertId

    const insertWeekdays: string[] = []
    for(const weekday of rule.Weekdays!)
        insertWeekdays.push(`(${escape(rule.Id)},${escape(weekday)})`)

    await sql`
        INSERT INTO
            x_timetag_rule_weekdays
            (TimeTagRuleId, Weekday)
        VALUES
            ${unsafe(insertWeekdays.join(','))}`

    res.status(201).send(rule)
})

router.get('/:timeTagId/rules/:ruleId', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const companyId = token.getPayloadField('cid')
    const timetagId = Number.parseInt(req.params.timeTagId)
    const ruleId    = Number.parseInt(req.params.ruleId)

    if(Number.isNaN(timetagId) || Number.isNaN(ruleId))
        return error(res, 400, 'Invalid URL')

    const rules = await fetchTimetagRules(companyId, 'TimeTagId', [timetagId])

    if(!rules.has(ruleId))
        return error(res, 404, 'Rule not found')

    res.send(rules.get(ruleId))
})

router.delete('/:timeTagId/rules/:ruleId', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const companyId = token.getPayloadField('cid')
    const timetagId = Number.parseInt(req.params.timeTagId)
    const ruleId    = Number.parseInt(req.params.ruleId)

    if(Number.isNaN(timetagId) || Number.isNaN(ruleId))
        return error(res, 400, 'Invalid URL')

    const rule = (await fetchTimetagRules(companyId, 'Id', [ruleId])).get(ruleId)

    if(typeof rule === 'undefined')
        return error(res, 404, 'Rule not found')

    const result = await sql`
        DELETE FROM
            timetag_rules
        WHERE
            CompanyId = ${companyId}
            AND TimeTagId = ${timetagId}
            AND Id = ${ruleId}
        LIMIT 1`

    if(result.affectedRows < 1)
        return error(res, 500, 'Failed to delete timetag rule')

    log.silly(`Timetag rule was deleted:\n${JSON.stringify(rule, null, 2)}`)

    res.sendStatus(204)
})

export default endpoint(router, {})
