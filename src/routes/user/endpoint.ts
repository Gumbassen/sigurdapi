
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'
import {
    SQLNoResultError,
    fetchFullTimeEntryTypeCollection,
    fetchFullUser,
    fetchTimeEntryTypeCollections,
    fetchUser,
    fetchUserLocations,
    fetchUserRolePermissions,
    fetchUserUserRoles,
    fetchUsers,
} from '../../utils/fetchfunctions'
import { error } from '../../utils/common'
import { escape, sql, unsafe } from '../../utils/database'

const router = express.Router()


router.get('/', async (req: Request, res: Response) =>
{
    const token = res.locals.accessToken!

    res.send(Array.from((await fetchUsers(
        token.getPayloadField('cid')
    )).values()))
})



// Must be added before the '/:userId' handler, otherwise the other one takes priority
router.get('/current', async (req: Request, res: Response) =>
{
    const token = res.locals.accessToken!

    res.send(await fetchFullUser(
        token.getPayloadField('cid'),
        token.getPayloadField('uid'),
    ))
})

router.get('/:userId', async (req: Request, res: Response) =>
{
    const token  = res.locals.accessToken!
    const userId = Number.parseInt(req.params.userId)

    if(Number.isNaN(userId))
        return error(res, 400, 'Invalid URL')

    try
    {
        res.send(await fetchUser(
            token.getPayloadField('cid'),
            'Id',
            userId,
        ))
    }
    catch(_error)
    {
        if(!(_error instanceof SQLNoResultError))
            throw _error

        log.warn(`no user with id=${userId}`)
        error(res, 404, 'User not found')
    }
})

router.get('/:userId/locations', async (req: Request, res: Response) =>
{
    const token  = res.locals.accessToken!
    const userId = Number.parseInt(req.params.userId)

    if(Number.isNaN(userId))
        return error(res, 400, 'Invalid URL')

    try
    {
        res.send(Array.from((await fetchUserLocations(
            token.getPayloadField('cid'),
            [userId],
        )).values()))
    }
    catch(_error)
    {
        if(!(_error instanceof SQLNoResultError))
            throw _error

        log.warn(`no user with id=${userId}`)
        error(res, 404, 'User not found')
    }
})

router.get('/:userId/roles', async (req: Request, res: Response) =>
{
    const token  = res.locals.accessToken!
    const userId = Number.parseInt(req.params.userId)

    if(Number.isNaN(userId))
        return error(res, 400, 'Invalid URL')

    try
    {
        res.send(Array.from((await fetchUserUserRoles(
            token.getPayloadField('cid'),
            [userId],
        )).values()))
    }
    catch(_error)
    {
        if(!(_error instanceof SQLNoResultError))
            throw _error

        log.warn(`no user with id=${userId}`)
        error(res, 404, 'User not found')
    }
})

router.get('/:userId/permissions', async (req: Request, res: Response) =>
{
    const token  = res.locals.accessToken!
    const userId = Number.parseInt(req.params.userId)

    if(Number.isNaN(userId))
        return error(res, 400, 'Invalid URL')

    try
    {
        res.send(Array.from((await fetchUserRolePermissions(
            token.getPayloadField('cid'),
            'UserId',
            [userId],
        )).values()))
    }
    catch(_error)
    {
        if(!(_error instanceof SQLNoResultError))
            throw _error

        log.warn(`no user with id=${userId}`)
        error(res, 404, 'User not found')
    }
})

router.get('/:userId/tagcollections', async (req: Request, res: Response) =>
{
    const token  = res.locals.accessToken!
    const userId = Number.parseInt(req.params.userId)

    if(Number.isNaN(userId))
        return error(res, 400, 'Invalid URL')

    res.send(Array.from((await fetchTimeEntryTypeCollections(
        token.getPayloadField('cid'),
        'UserId',
        [userId]
    )).values()))
})

router.post('/:userId/tagcollections', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const companyId = token.getPayloadField('cid')
    const userId    = Number.parseInt(req.params.userId)

    if(Number.isNaN(userId))
        return error(res, 400, 'Invalid URL')

    const requiredProps: (keyof ApiDataTypes.Objects.TimeEntryTypeCollection)[] = [
        'TimeEntryTypeId',
        'TimeTagIds',
    ]

    const optionalProps: (keyof ApiDataTypes.Objects.TimeEntryTypeCollection)[] = []

    // @ts-expect-error Im using this to build the object
    const collection: ApiDataTypes.Objects.TimeEntryTypeCollection = {
        UserId:     userId,
        CompanyId:  companyId,
        TimeTagIds: [],
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
            case 'TimeEntryTypeId':
                collection.TimeEntryTypeId = Number.parseInt(value)
                if(Number.isNaN(collection.TimeEntryTypeId) || collection.TimeEntryTypeId < 1)
                    return error(res, 400, `Param "${field}" is invalid.`)
                break

            case 'TimeTagIds':
                if(!Array.isArray(value))
                    return error(res, 400, `Param "${field}" must be an array.`)

                if(!value.length)
                    return error(res, 400, `Param "${field}" cannot be empty.`)

                for(const id of value.map(id => Number.parseInt(id)))
                {
                    if(Number.isNaN(id))
                        return error(res, 400, `Param "${field}" contains invalid entries.`)

                    collection.TimeTagIds.push(id)
                }
                break
        }
    }

    const permissionChecks = new Map<string, string>()
    if(collection.TimeEntryTypeId)
    {
        permissionChecks.set('TimeEntryTypeId', /*SQL*/`(
            ${escape(collection.TimeEntryTypeId)} IN (
                SELECT
                    Id
                FROM
                    time_entry_types
                WHERE
                    CompanyId = ${escape(collection.CompanyId)}
                    AND Id = ${escape(collection.TimeEntryTypeId)}
            )
            AND ${escape(collection.TimeEntryTypeId)} NOT IN (
                SELECT
                    TimeEntryTypeId
                FROM
                    time_entry_type_collections
                WHERE
                    CompanyId = ${escape(collection.CompanyId)}
                    AND UserId = ${escape(collection.UserId)}
            )
        ) AS TimeEntryTypeId `)
    }

    if(collection.UserId)
    {
        permissionChecks.set('UserId', /*SQL*/`(
            ${escape(collection.UserId)} IN (
                SELECT
                    Id
                FROM
                    users
                WHERE
                    CompanyId = ${escape(collection.CompanyId)}
            )
        ) AS UserId `)
    }

    if(collection.TimeTagIds.length)
    {
        permissionChecks.set('TimeTagIds', /*SQL*/`(
            SELECT
                COUNT(Id) = 0
            FROM
                timetags
            WHERE
                Id IN (${escape(collection.TimeTagIds)})
                AND CompanyId != ${escape(collection.CompanyId)}
        ) AS TimeTagIds `)
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
                time_entry_type_collections
            SET
                UserId          = ${collection.UserId},
                CompanyId       = ${collection.CompanyId},
                TimeEntryTypeId = ${collection.TimeEntryTypeId}`
    
        collection.Id = result.insertId
    
        log.silly(`Tag collection was created:\n${JSON.stringify(collection, null, 2)}`)
        
        if(collection.TimeTagIds.length)
        {
            await sql`
                INSERT INTO
                    x_time_entry_type_collection_timetags
                    (
                        TimeEntryTypeCollectionId,
                        TimeTagId
                    )
                VALUES
                    ${unsafe(collection.TimeTagIds.map(id => `(${escape(collection.Id)}, ${escape(id)})`).join(','))}`
        }
    
        res.status(201).send(collection)
    }
    catch(_error)
    {
        log.error(_error)
        error(res, 500, 'Unknown error')
    }
})

router.get('/:userId/tagcollections/:collectionId', async (req: Request, res: Response) =>
{
    const token        = res.locals.accessToken!
    const userId       = Number.parseInt(req.params.userId)
    const collectionId = Number.parseInt(req.params.collectionId)

    if(Number.isNaN(userId) || Number.isNaN(collectionId))
        return error(res, 400, 'Invalid URL')

    try
    {
        const collection = await fetchFullTimeEntryTypeCollection(
            token.getPayloadField('cid'),
            collectionId
        )

        if(collection.UserId !== userId)
            return error(res, 404, 'Tag collection not found')

        res.send(collection)
    }
    catch(_error)
    {
        if(!(_error instanceof SQLNoResultError))
            throw _error

        error(res, 404, 'Tag collection not found')
    }
})

router.delete('/:userId/tagcollections/:collectionId', async (req: Request, res: Response) =>
{
    const token        = res.locals.accessToken!
    const companyId    = token.getPayloadField('cid')
    const userId       = Number.parseInt(req.params.userId)
    const collectionId = Number.parseInt(req.params.collectionId)

    if(Number.isNaN(userId) || Number.isNaN(collectionId))
        return error(res, 400, 'Invalid URL')

    const collections = await fetchTimeEntryTypeCollections(
        companyId,
        'Id',
        [collectionId]
    )

    if(!collections.has(collectionId))
        return error(res, 404, 'Tag collection not found')

    const collection = collections.get(collectionId)!

    if(collection.UserId !== userId)
        return error(res, 404, 'Tag collection not found')

    try
    {
        const result = await sql`
            DELETE FROM
                time_entry_type_collections
            WHERE
                CompanyId = ${companyId}
                AND UserId = ${userId}
                AND Id = ${collectionId}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Deletion failed')

        log.silly(`Deleted TimeEntryTypeCollection: Id=${collectionId}, UserId=${userId}, CompanyId=${companyId}`)
            
        res.sendStatus(204)
    }
    catch(_error)
    {
        error(res, 500, 'Deletion failed')

        throw _error
    }
})

export default endpoint(router, {})
