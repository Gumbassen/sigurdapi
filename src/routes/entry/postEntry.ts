import { Request, Response, Router } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { escape, sql, unsafe } from '../../utils/database'
import log from '../../utils/logger'

type ApiTimeEntry = ApiDataTypes.Objects.TimeEntry

export default function(router: Router)
{
    router.post('/', async (req: Request, res: Response) =>
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

            const value = Number.parseInt(req.body[field])

            if(Number.isNaN(value) || value < 1)
                return error(res, 400, `Param "${field}" is invalid.`)

            switch(field)
            {
                case 'UserId':
                case 'LocationId':
                case 'GroupingId':
                case 'TimeEntryTypeId':
                case 'Start':
                case 'End':
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
                    TimeEntryTypeId = ${entry.TimeEntryTypeId ?? null}`
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
