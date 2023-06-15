import { Request, Response, Router } from 'express'
import { error, notAllowed, wsbroadcast } from '../../utils/common'
import { escape, sql, unsafe } from '../../utils/database'
import log from '../../utils/Logger'
import permission from '../../middlewares/permission'
import { EUserRolePermission as URP } from '../../enums/userpermissions'
import { alphanumRx } from '../../utils/helpers/regexes'

type ApiTimeEntry = ApiDataTypes.Objects.TimeEntry

export default function(router: Router)
{
    router.post('/', permission.oneOf(URP.create_own_entries, URP.manage_location_entries), async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')

        const requiredProps: (keyof ApiTimeEntry)[] = [
            'UserId',
            'Start',
            'End',
            'LocationId',
        ]

        const optionalProps: (keyof ApiTimeEntry)[] = [
            'GroupingId',
            'TimeEntryTypeId',
            'Status',
        ]

        const partialEntry: Partial<ApiTimeEntry> = {
            CompanyId:  companyId,
            MessageIds: [],
        }
        for(const field of requiredProps.concat(optionalProps))
        {
            if(!(field in req.body) || req.body[field] === null)
            {
                if(optionalProps.includes(field))
                    continue

                return error(res, 400, `Param "${field}" is required.`)
            }

            const value = req.body[field]
            switch(field)
            {
                case 'UserId':
                case 'LocationId':
                case 'GroupingId':
                case 'TimeEntryTypeId':
                case 'Start':
                case 'End':
                    partialEntry[field] = Number.parseInt(value)
                    if(Number.isNaN(partialEntry[field]) || partialEntry[field]! < 1)
                        return error(res, 400, `Param "${field}" is invalid (must be a valid, positive, non-zero integer).`)
                    break

                case 'Status':
                    if(value.length < 1 || !alphanumRx.test(value))
                        return error(res, 400, `Param "${field}" is invalid (must be a non-empty alphanumeric string).`)
                    partialEntry[field] = value
                    break
            }
        }
        const entry = partialEntry as ApiTimeEntry


        if(entry.Start >= entry.End)
            return error(res, 400, 'Param "Start" cannot be on or after "End".')
        entry.Duration = entry.End - entry.Start


        const permissionChecks = new Map<string, string>()
        if(entry.LocationId)
        {
            permissionChecks.set('LocationId', /*SQL*/`(
                ${escape(entry.LocationId)} IN (
                    SELECT
                        Id
                    FROM
                        locations
                    WHERE
                        CompanyId = ${escape(entry.CompanyId)}
                        AND Id = ${escape(entry.LocationId)}
                )
            ) AS LocationId `)
        }

        if(entry.TimeEntryTypeId)
        {
            permissionChecks.set('TimeEntryTypeId', /*SQL*/`(
                ${escape(entry.TimeEntryTypeId)} IN (
                    SELECT
                        Id
                    FROM
                        time_entry_types
                    WHERE
                        CompanyId = ${escape(entry.CompanyId)}
                        AND Id = ${escape(entry.TimeEntryTypeId)}
                )
            ) AS TimeEntryTypeId `)
        }

        if(entry.UserId)
        {
            permissionChecks.set('UserId', /*SQL*/`(
                ${escape(entry.UserId)} IN (
                    SELECT
                        Id
                    FROM
                        users
                    WHERE
                        CompanyId = ${escape(entry.CompanyId)}
                        AND Id = ${escape(entry.UserId)}
                )
            ) AS UserId `)
        }

        if(permissionChecks.size)
        {
            const result = await sql`SELECT ${unsafe(Array.from(permissionChecks.values()).join(','))}`

            for(const prop of permissionChecks.keys())
            {
                if(result[0][prop] !== 1)
                    return error(res, 400, `Param "${prop}" is invalid.`)
            }
        }

        if(!token.hasPermission(URP.manage_location_entries))
        {
            if(entry.UserId !== token.getPayloadField('uid'))
                return notAllowed(res)

            if(!token.hasLocation(entry.LocationId))
                return notAllowed(res)
        }
        else if(!token.isLeaderOf(entry.LocationId))
        {
            return notAllowed(res)
        }


        try
        {
            const result = await sql`
                INSERT INTO
                    timeentries
                SET
                    CompanyId       = ${entry.CompanyId},
                    UserId          = ${entry.UserId},
                    Start           = FROM_UNIXTIME(${entry.Start}),
                    End             = FROM_UNIXTIME(${entry.End}),
                    Duration        = ${entry.Duration},
                    GroupingId      = ${entry.GroupingId ?? null},
                    LocationId      = ${entry.LocationId},
                    TimeEntryTypeId = ${entry.TimeEntryTypeId ?? null}
                    Status          = ${entry.Status ?? null}`
            entry.Id = result.insertId

            log.silly(`Time entry was created:\n${JSON.stringify(entry, null, 2)}`)

            wsbroadcast(res, entry.CompanyId, 'created', 'TimeEntry', entry)
            res.status(201).send(entry)
        }
        catch(_error)
        {
            log.error(_error)
            error(res, 500, 'Unknown error')
        }
    })
}
