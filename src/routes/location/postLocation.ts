import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { escape, sql, unsafe } from '../../utils/database'
import log from '../../utils/Logger'

type ApiLocation = ApiDataTypes.Objects.Location

export default function(router: Router)
{
    router.post('/', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')

        const requiredProps: (keyof ApiLocation)[] = ['Name']

        const optionalProps: (keyof ApiLocation)[] = [
            'Description',
            'LeaderIds',
        ]

        // @ts-expect-error Im using this to build the object
        const location: ApiLocation = {
            CompanyId: companyId,
            LeaderIds: [],
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
                case 'Name':
                case 'Description':
                    if(typeof value !== 'string')
                        return error(res, 400, `Param "${field}" must be a string.`)

                    if(!value.length)
                    {
                        if(optionalProps.includes(field)) break
                        return error(res, 400, `Param "${field}" cannot be empty.`)
                    }

                    location[field] = value
                    break

                case 'LeaderIds':
                    if(!Array.isArray(value))
                        return error(res, 400, `Param "${field}" must be an array.`)

                    if(!value.length)
                        break

                    for(const id of value.map(id => Number.parseInt(id, 10)))
                    {
                        if(Number.isNaN(id))
                            return error(res, 400, `Param "${field}" contains invalid entries.`)

                        if(location.LeaderIds.includes(id))
                            continue

                        location.LeaderIds.push(id)
                    }
                    break
            }
        }


        const permissionChecks = new Map<string, string>()
        if(location.LeaderIds.length)
        {
            const sortedLeaderIds = location.LeaderIds.unique().sort()
            permissionChecks.set('LeaderIds', /*SQL*/`(
                SELECT
                    GROUP_CONCAT(DISTINCT u.Id ORDER BY u.Id ASC SEPERATOR ',') = ${escape(sortedLeaderIds.join(','))}
                FROM
                    users AS u
                WHERE
                    u.CompanyId = ${escape(location.CompanyId)}
                    AND u.Id IN (${escape(location.LeaderIds)})
                GROUP BY
                    u.Id
            ) AS LeaderIds `)
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
                    locations
                SET
                    CompanyId   = ${location.CompanyId},
                    Name        = ${location.Name},
                    Description = ${location.Description ?? null}`

            location.Id = result.insertId

            log.silly(`Location was created:\n${JSON.stringify(location, null, 2)}`)

            if(location.LeaderIds.length)
            {
                await sql`
                    INSERT INTO
                        x_location_leaders
                        (
                            LocationId,
                            UserId
                        )
                    VALUES
                        ${unsafe(location.LeaderIds.map(id => `(${escape(location.Id)}, ${escape(id)})`).join(','))}`
            }

            wsbroadcast(res, companyId, 'created', 'Location', location)
            res.status(201).send(location)
        }
        catch(_error)
        {
            log.error(_error)
            error(res, 500, 'Unknown error')
        }
    })
}
