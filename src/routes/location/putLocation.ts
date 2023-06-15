import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { fetchLocation } from '../../utils/fetchfunctions'
import isValidKeyOf from '../../utils/helpers/isvalidkeyof'
import { escape, sql, unsafe } from '../../utils/database'
import log from '../../utils/Logger'

type ApiLocation = ApiDataTypes.Objects.Location

export default function(router: Router)
{
    router.put('/:locationId', async (req: Request, res: Response) =>
    {
        const token      = res.locals.accessToken!
        const companyId  = token.getPayloadField('cid')
        const locationId = Number.parseInt(req.params.locationId)

        const updateableProps: (keyof ApiLocation)[] = [
            'Name',
            'Description',
        ]

        if(Number.isNaN(locationId))
            return error(res, 400, 'Invalid URL')

        const location = await fetchLocation(companyId, locationId, false)
        if(!location) return error(res, 404, 'Location not found')


        // Starts out as a copy of the original object
        const updatedLocation: Partial<ApiLocation> = Object.assign({}, location)
        for(const field of Object.keys(updatedLocation) as (keyof ApiLocation)[])
        {
            if(!updateableProps.includes(field))
                delete updatedLocation[field]
        }

        // Replace any given fields in the "update" object
        for(const field in req.body)
        {
            if(!isValidKeyOf<ApiLocation>(field, updateableProps))
                return error(res, 400, `Param "${field}" is not updateable or is otherwise invalid.`)

            const value = req.body[field] as string | null

            if(value === null)
                return error(res, 400, `Param "${field}" is not nullable. Omit the parameter if you wish not to update it.`)

            switch(field)
            {
                case 'Name':
                case 'Description':
                    if(!value.length)
                        return error(res, 400, `Param "${field}" is invalid (must be a non-empty string).`)
                    updatedLocation[field] = value
                    break
            }
        }


        const permissionChecks = new Map<string, string>()

        if(updatedLocation.Name !== location.Name)
        {
            permissionChecks.set('Name', /*SQL*/`(
                (
                    SELECT
                        COUNT(l.Name) = 0
                    FROM
                        locations AS l
                    WHERE
                        l.CompanyId = ${escape(companyId)}
                        AND l.Name = ${escape(updatedLocation.Name)}
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
            if(location[field] === updatedLocation[field])
                continue

            switch(field)
            {
                // Strings and numbers
                case 'Name':
                case 'Description':
                    updateSet.push(/*SQL*/`${field} = ${escape(updatedLocation[field])}`)
                    break
            }
        }


        const queries = []
        if(updateSet.length)
        {
            queries.push(sql`
                UPDATE
                    locations
                SET
                    ${unsafe(updateSet.join(','))}
                WHERE
                    Id = ${locationId}
                    AND CompanyId = ${companyId}
                LIMIT 1
            `)
        }

        if(!queries.length) // No changes then
            return res.send(location)

        await Promise.all(queries).catch(_error =>
        {
            log.error(_error)
            return Promise.reject(_error)
        })

        const fetched = await fetchLocation(companyId, locationId, false)
        if(!fetched) return error(res, 500, 'Location could not be returned')
        wsbroadcast(res, companyId, 'updated', 'Location', fetched)
        res.send(fetched)
    })
}
