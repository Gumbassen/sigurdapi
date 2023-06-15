import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { ONE_DAY_SECONDS } from '../../utils/helpers/timedefinitions'
import { ETimetagWeekday } from '../../enums/timetagweekdays'
import { escape, sql, unsafe } from '../../utils/database'
import { fetchFullTimetag } from '../../utils/fetchfunctions'
import permission from '../../middlewares/permission'
import { EUserRolePermission as URP } from '../../enums/userpermissions'

type ApiTimetag     = ApiDataTypes.Objects.Timetag
type ApiTimetagRule = ApiDataTypes.Objects.TimetagRule

export default function(router: Router)
{
    router.post('/', permission.has(URP.manage_all_timetags), async (req: Request, res: Response) =>
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

        const fetched = await fetchFullTimetag(companyId, timetagId)
        wsbroadcast(res, companyId, 'created', 'TimeTag', fetched)
        res.status(201).send(fetched)
    })
}
