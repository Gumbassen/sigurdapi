import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { SQLNoResultError, fetchFullTimetag } from '../../utils/fetchfunctions'
import log from '../../utils/logger'
import isValidKeyOf from '../../utils/isvalidkeyof'
import { escape, sql, unsafe } from '../../utils/database'

type ApiTimetag = ApiDataTypes.Objects.Timetag

export default function(router: Router)
{
    router.put('/:timeTagId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const timetagId = Number.parseInt(req.params.timeTagId)

        const updateableProps: (keyof ApiTimetag)[] = [
            'Name',
            'BasisType',
            'BasisAmount',
        ]

        if(Number.isNaN(timetagId))
            return error(res, 400, 'Invalid URL')

        const timetag = await fetchFullTimetag(companyId, timetagId).catch(_error =>
        {
            if(!(_error instanceof SQLNoResultError))
                throw _error

            log.warn(`No timetag with id=${timetagId}`)
            error(res, 404, 'Timetag not found')
        })
        if(typeof timetag === 'undefined') return


        // Starts out as a copy of the original object
        const updatedTimetag: Partial<ApiTimetag> = Object.assign({}, timetag)
        for(const field of Object.keys(updatedTimetag) as (keyof ApiTimetag)[])
        {
            if(!updateableProps.includes(field))
                delete updatedTimetag[field]
        }

        // Replace any given fields in the "update" object
        for(const field in req.body)
        {
            if(!isValidKeyOf<ApiTimetag>(field, updateableProps))
                return error(res, 400, `Param "${field}" is not updateable or is otherwise invalid.`)

            const value = req.body[field] as string | null

            if(value === null)
                return error(res, 400, `Param "${field}" is not nullable. Omit the parameter if you wish not to update it.`)

            switch(field)
            {
                case 'Name':
                case 'BasisType':
                    if(!value.length)
                        return error(res, 400, `Param "${field}" is invalid (must be a non-empty string).`)
                    updatedTimetag[field] = value
                    break

                case 'BasisAmount':
                    updatedTimetag[field] = Number.parseFloat(value)
                    if(Number.isNaN(updatedTimetag[field]) || !Number.isFinite(updatedTimetag[field]))
                        return error(res, 400, `Param "${field}" is invalid (must be a valid finite floating point number).`)
                    break
            }
        }


        const permissionChecks = new Map<string, string>()

        if(updatedTimetag.Name !== timetag.Name)
        {
            permissionChecks.set('Name', /*SQL*/`(
                (
                    SELECT
                        COUNT(tt.Name) = 0
                    FROM
                        timetags AS tt
                    WHERE
                        tt.CompanyId = ${escape(companyId)}
                        AND tt.Name = ${escape(updatedTimetag.Name)}
                )
            ) AS Name `)
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

        const updateSet: string[]     = []
        for(const field of updateableProps)
        {
            if(timetag[field] === updatedTimetag[field])
                continue

            switch(field)
            {
                // Strings and numbers
                case 'Name':
                case 'BasisType':
                case 'BasisAmount':
                    updateSet.push(/*SQL*/`tt.${field} = ${escape(updatedTimetag[field])}`)
                    break
            }
        }


        const queries = []
        if(updateSet.length)
        {
            queries.push(sql`
                UPDATE
                    timetags AS tt
                SET
                    ${unsafe(updateSet.join(','))}
                WHERE
                    tt.Id = ${timetagId}
                    AND tt.CompanyId = ${companyId}
                LIMIT 1
            `)
        }

        if(!queries.length) // No changes then
            return res.send(timetag)

        await Promise.all(queries).catch(_error =>
        {
            log.error(_error)
            return Promise.reject(_error)
        })

        const fetched = await fetchFullTimetag(companyId, timetagId)
        wsbroadcast(res, companyId, 'updated', 'TimeTag', fetched)
        res.send(fetched)
    })
}
