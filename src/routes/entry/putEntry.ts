import { Router, Request, Response } from 'express'
import log from '../../utils/logger'
import { error, wsbroadcast } from '../../utils/common'
import { fetchTimeEntry } from '../../utils/fetchfunctions'
import isValidKeyOf from '../../utils/isvalidkeyof'
import { escape, sql, unsafe } from '../../utils/database'

type ApiTimeEntry = ApiDataTypes.Objects.TimeEntry

export default function(router: Router)
{
    router.put('/:entryId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const entryId   = Number.parseInt(req.params.entryId)

        const updateableProps: (keyof ApiTimeEntry)[] = [
            'UserId',
            'Start',
            'End',
            'GroupingId',
            'LocationId',
            'TimeEntryTypeId',
        ]

        const nullableProps: (keyof ApiTimeEntry)[] = [
            'UserId',
            'GroupingId',
            'TimeEntryTypeId',
        ]

        if(Number.isNaN(entryId))
            return error(res, 400, 'Invalid URL')


        const entry = await fetchTimeEntry(companyId, entryId, false)
        if(!entry)
        {
            log.warn(`No entry with id=${entryId}`)
            return error(res, 404, 'Entry not found')
        }


        // Starts out as a copy of the original object
        const updatedEntry: NullablePartial<ApiTimeEntry> = Object.assign({}, entry)
        for(const field of Object.keys(updatedEntry).difference(updateableProps) as (keyof ApiTimeEntry)[])
            delete updatedEntry[field]

        // Replace any given fields in the "update" object
        for(const field in req.body)
        {
            if(!isValidKeyOf<ApiTimeEntry>(field, updateableProps))
                return error(res, 400, `Param "${field}" is not updateable or is otherwise invalid.`)

            const value = req.body[field]

            if(value === null)
            {
                if(nullableProps.includes(field))
                {
                    updatedEntry[field] = null
                    continue
                }

                return error(res, 400, `Param "${field}" is not nullable. Omit the parameter if you wish not to update it.`)
            }

            switch(field)
            {
                case 'UserId':
                case 'GroupingId':
                case 'LocationId':
                case 'TimeEntryTypeId':
                    updatedEntry[field] = Number.parseInt(value)
                    if(Number.isNaN(updatedEntry[field]))
                        return error(res, 400, `Param "${field}" is invalid (must be an integer).`)
                    break

                case 'Start':
                case 'End':
                    updatedEntry[field] = Number.parseInt(value)
                    if(Number.isNaN(value))
                        return error(res, 400, `Param "${field}" is invalid (must be an integer / unix timestamp).`)
                    break
            }
        }


        if(updatedEntry.Start || updatedEntry.End)
        {
            const start = updatedEntry.Start ?? entry.Start
            const end   = updatedEntry.End   ?? entry.End

            if(end <= start)
                return error(res, 400, 'Param "Start" must be before "End".')
                
            updatedEntry.Duration = end - start
        }


        const permissionChecks = new Map<string, string>()
        if(updatedEntry.UserId)
        {
            permissionChecks.set('UserId', /*SQL*/`(
                SELECT
                    COUNT(Id) = 1
                FROM
                    users
                WHERE
                    CompanyId = ${escape(companyId)}
                    AND Id = ${escape(updatedEntry.UserId)}
            ) AS UserId `)
        }

        if(updatedEntry.LocationId)
        {
            permissionChecks.set('LocationId', /*SQL*/`(
                SELECT
                    COUNT(Id) = 1
                FROM
                    locations
                WHERE
                    CompanyId = ${escape(companyId)}
                    AND Id = ${escape(updatedEntry.LocationId)}
            ) as LocationId `)
        }

        if(updatedEntry.TimeEntryTypeId)
        {
            permissionChecks.set('TimeEntryTypeId', /*SQL*/`(
                SELECT
                    COUNT(Id) = 1
                FROM
                    time_entry_types
                WHERE
                    CompanyId = ${escape(companyId)}
                    AND Id = ${escape(updatedEntry.TimeEntryTypeId)}
            ) AS TimeEntryTypeId `)
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

        const updateSet: string[] = []
        for(const field of updateableProps.concat(Object.keys(updatedEntry) as (keyof ApiTimeEntry)[]).unique())
        {
            if(entry[field] == null && updatedEntry[field] == null)
            {
                log.silly(`Skipped ${field} (null)`)
                continue
            }

            if(entry[field] === updatedEntry[field])
            {
                log.silly(`Skipped ${field} (exact match)`)
                continue
            }

            switch(field)
            {
                case 'UserId': // Strings and numbers
                case 'LocationId':
                case 'GroupingId':
                case 'TimeEntryTypeId':
                case 'Duration':
                    if(updatedEntry[field] == null)
                    {
                        if(!nullableProps.includes(field))
                            return error(res, 500, `(unreachable?) The field "${field}" cannot be set to null.`)

                        updateSet.push(/*SQL*/`te.${field} = NULL`)
                    }
                    else
                    {
                        updateSet.push(/*SQL*/`te.${field} = ${escape(updatedEntry[field])}`)
                    }
                    break
                    
                case 'Start':
                case 'End':
                    updateSet.push(/*SQL*/`te.${field} = FROM_UNIXTIME(${escape(updatedEntry[field])})`)
                    break
            }
        }

        if(!updateSet.length) // No changes then
            return res.send(entry)

        await sql`
            UPDATE
                timeentries AS te
            SET
                ${unsafe(updateSet.join(','))}
            WHERE
                te.CompanyId = ${companyId}
                AND te.Id = ${entryId}
            LIMIT 1`

        const fetched = await fetchTimeEntry(companyId, entryId)
        wsbroadcast(res, companyId, 'updated', 'TimeEntry', fetched)
        res.send(fetched)
    })
}
