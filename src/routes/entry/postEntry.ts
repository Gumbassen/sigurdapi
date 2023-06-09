import { Request, Response, Router } from 'express'
import { error } from '../../utils/common'
import { escape, sql, unsafe } from '../../utils/database'
import log from '../../utils/logger'

interface TimeEntryWithDates extends ApiDataTypes.Objects.TimeEntry {
    StartDate?: Date
    EndDate?:   Date
}

export default function(router: Router)
{
    router.post('/', async (req: Request, res: Response) =>
    {
        const requiredProps: (keyof ApiDataTypes.Objects.TimeEntry)[] = [
            'UserId',
            'Start',
            'End',
            'LocationId',
        ]

        const optionalProps: (keyof ApiDataTypes.Objects.TimeEntry)[] = [
            'GroupingId',
            'TimeEntryTypeId',
        ]

        // @ts-expect-error Im using this to build the object
        const entry: TimeEntryWithDates = {
            CompanyId: res.locals.accessToken!.getPayloadField('cid'),
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
                    entry[field] = value
                    break
            }
        }

        if(entry.Start >= entry.End)
            return error(res, 400, 'Param "Start" cannot be on or after "End".')


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

        entry.StartDate  = new Date(entry.Start)
        entry.EndDate    = new Date(entry.End)
        entry.Duration   = entry.EndDate.getTime() - entry.StartDate.getTime()
        entry.MessageIds = []

        try
        {
            const result = await sql`
                INSERT INTO
                    timeentries
                SET
                    CompanyId       = ${entry.CompanyId},
                    UserId          = ${entry.UserId},
                    Start           = ${entry.StartDate},
                    End             = ${entry.EndDate},
                    Duration        = ${entry.Duration},
                    GroupingId      = ${entry.GroupingId ?? null},
                    LocationId      = ${entry.LocationId},
                    TimeEntryTypeId = ${entry.TimeEntryTypeId ?? null}`

            entry.Id = result.insertId

            log.silly(`Time entry was created:\n${JSON.stringify(entry, null, 2)}`)
            delete entry.StartDate
            delete entry.EndDate

            res.status(201).send(entry)
        }
        catch(_error)
        {
            log.error(_error)
            error(res, 500, 'Unknown error')
        }
    })
}