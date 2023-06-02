import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'
import { fetchLocationUsers, fetchLocations, fetchUsers } from '../../utils/fetchfunctions'
import { escape, sql, unsafe } from '../../utils/database'
import { error } from '../../utils/common'

const router = express.Router()


router.get('/', async (req: Request, res: Response) =>
{
    const token = res.locals.accessToken!

    res.send(Array.from((await fetchLocations(
        token.getPayloadField('cid')
    )).values()))
})

router.post('/', async (req: Request, res: Response) =>
{
    const token = res.locals.accessToken!

    const requiredProps: (keyof ApiDataTypes.Objects.Location)[] = ['Name']

    const optionalProps: (keyof ApiDataTypes.Objects.Location)[] = [
        'Description',
        'LeaderIds',
    ]

    // @ts-expect-error Im using this to build the object
    const entry: ApiDataTypes.Objects.Location = {
        CompanyId: token.getPayloadField('cid'),
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

                entry[field] = value
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

                    if(entry.LeaderIds.includes(id))
                        continue

                    entry.LeaderIds.push(id)
                }
                break
        }
    }


    const permissionChecks = new Map<string, string>()
    if(entry.LeaderIds.length)
        permissionChecks.set('LeaderIds', `(${escape(entry.LeaderIds)} IN (SELECT Id FROM users WHERE CompanyId = ${escape(entry.CompanyId)})) AS LeaderIds`)

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
        const locationResult = await sql`
            INSERT INTO
                locations
            SET
                CompanyId   = ${entry.CompanyId},
                Name        = ${entry.Name},
                Description = ${entry.Description ?? null}`

        entry.Id = locationResult.insertId

        log.silly(`Location was created:\n${JSON.stringify(entry, null, 2)}`)

        if(entry.LeaderIds.length)
        {
            await sql`
                INSERT INTO
                    x_location_leaders
                    (
                        LocationId,
                        UserId
                    )
                VALUES
                    ${unsafe(entry.LeaderIds.map(id => `(${escape(entry.Id)}, ${escape(id)})`).join(','))}`
        }

        res.status(201).send(entry)
    }
    catch(_error)
    {
        log.error(_error)
        error(res, 500, 'Unknown error')
    }
})

router.get('/:locationId', async (req: Request, res: Response) =>
{
    const token      = res.locals.accessToken!
    const locationId = Number.parseInt(req.params.locationId)

    if(Number.isNaN(locationId))
        return error(res, 400, 'Invalid URL')

    const locations = await fetchLocations(
        token.getPayloadField('cid'),
        'Id',
        [locationId],
    )

    if(!locations.has(locationId))
        return error(res, 404, 'Location not found')

    res.send(locations.get(locationId))
})

router.get('/:locationId/users', async (req: Request, res: Response) =>
{
    const token      = res.locals.accessToken!
    const locationId = Number.parseInt(req.params.locationId)

    if(Number.isNaN(locationId))
        return error(res, 400, 'Invalid URL')

    const usersByLocation = await fetchLocationUsers(
        token.getPayloadField('cid'),
        [locationId],
    )

    if(!usersByLocation.has(locationId))
        return error(res, 404, 'Location not found')

    res.send(usersByLocation.get(locationId))
})

router.get('/:locationId/leaders', async (req: Request, res: Response) =>
{
    const token      = res.locals.accessToken!
    const locationId = Number.parseInt(req.params.locationId)

    if(Number.isNaN(locationId))
        return error(res, 400, 'Invalid URL')

    const locations = await fetchLocations(
        token.getPayloadField('cid'),
        'Id',
        [locationId],
    )

    if(!locations.has(locationId))
        return error(res, 404, 'Location not found')

    res.send(Array.from((await fetchUsers(
        token.getPayloadField('cid'),
        [{ field: 'Id', value: locations.get(locationId)!.LeaderIds }]
    )).values()))
})

export default endpoint(router, {})
