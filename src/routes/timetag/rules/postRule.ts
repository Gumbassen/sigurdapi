import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../../utils/common'
import { ONE_DAY_SECONDS } from '../../../utils/helpers/timedefinitions'
import { ETimetagWeekday } from '../../../enums/timetagweekdays'
import { escape, sql, unsafe } from '../../../utils/database'

type ApiTimetagRule = ApiDataTypes.Objects.TimetagRule

export default function(router: Router)
{
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

        wsbroadcast(res, companyId, 'created', 'TimeTagRule', rule)
        res.status(201).send(rule)
    })
}
