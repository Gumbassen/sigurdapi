
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
import { escape, nullableEpoch, sql, unsafe } from '../../utils/database'
import isValidKeyOf from '../../utils/isvalidkeyof'

type ApiUser                    = ApiDataTypes.Objects.User
type ApiTimeEntryTypeCollection = ApiDataTypes.Objects.TimeEntryTypeCollection

const router = express.Router()


router.get('/', async (req: Request, res: Response) =>
{
    const token = res.locals.accessToken!

    res.send(Array.from((await fetchUsers(
        token.getPayloadField('cid')
    )).values()))
})

router.post('/', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const companyId = token.getPayloadField('cid')

    const requiredProps: (keyof ApiUser)[] = [
        'UserRoleId',
        'FirstName',
        'SurName',
    ]

    const optionalProps: (keyof ApiUser)[] = [
        'MiddleName',
        'ProfileImage',
        'HiredDate',
        'FiredDate',
        'LocationIds',
    ]

    // @ts-expect-error Im using this to build the object
    const userObj: ApiUser = {
        CompanyId:            companyId,
        TimeTagCollectionIds: [],
        LocationIds:          [],
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
            case 'UserRoleId':
            case 'ProfileImage':
                userObj[field] = Number.parseInt(value)
                if(Number.isNaN(value))
                    return error(res, 400, `Param "${field}" is invalid.`)
                break

            case 'FirstName':
            case 'MiddleName':
            case 'SurName':
                userObj[field] = value
                if(!value.length)
                    return error(res, 400, `Param "${field}" cannot be empty.`)
                break

            case 'FiredDate':
            case 'HiredDate':
                userObj[field] = Number.parseInt(value)
                if(Number.isNaN(value))
                    return error(res, 400, `Param "${field}" is invalid.`)
                break

            case 'LocationIds':
                if(!Array.isArray(value))
                    return error(res, 400, `Param "${field}" must be an array of integers.`)
                for(const id of value.map(id => Number.parseInt(id)))
                {
                    if(Number.isNaN(id))
                        return error(res, 400, `Param "${field}" contains invalid entries.`)

                    if(userObj[field].includes(id))
                        continue

                    userObj[field].push(id)
                }
                break
        }
    }


    if(userObj.HiredDate && userObj.FiredDate && userObj.FiredDate <= userObj.HiredDate)
        return error(res, 400, 'Param "FiredDate" cannot be on or after "HiredDate".')


    const permissionChecks = new Map<string, string>()
    if(userObj.LocationIds.length)
    {
        permissionChecks.set('LocationIds', /*SQL*/`(
            SELECT
                COUNT(Id) = ${escape(userObj.LocationIds.length)}
            FROM
                locations
            WHERE
                Id IN (${escape(userObj.LocationIds)})
                AND CompanyId = ${escape(userObj.CompanyId)}
        ) AS LocationIds `)
    }

    if(userObj.UserRoleId)
    {
        permissionChecks.set('UserRoleId', /*SQL*/`(
            ${escape(userObj.UserRoleId)} IN (
                SELECT
                    Id
                FROM
                    user_roles
                WHERE
                    CompanyId = ${escape(userObj.CompanyId)}
                    AND Id = ${escape(userObj.UserRoleId)}
            )
        ) AS UserRoleId `)
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

    userObj.FullName = [ userObj.FirstName, ...userObj.MiddleName ? [userObj.MiddleName] : [], userObj.SurName ].join(' ')
    
    try
    {
        const result = await sql`
            INSERT INTO
                users
            SET
                CompanyId    = ${userObj.CompanyId},
                UserRoleId   = ${userObj.UserRoleId},
                FullName     = ${userObj.FullName},
                FirstName    = ${userObj.FirstName},
                MiddleName   = ${userObj.MiddleName ?? null},
                SurName      = ${userObj.SurName},
                ProfileImage = ${userObj.ProfileImage ?? null},
                HiredDate    = ${nullableEpoch(userObj.HiredDate)},
                FiredDate    = ${nullableEpoch(userObj.FiredDate)}`
    
        userObj.Id = result.insertId
    
        log.silly(`User was created:\n${JSON.stringify(userObj, null, 2)}`)

        if(userObj.LocationIds.length)
        {
            await sql`
                INSERT INTO
                    x_user_locations
                    (
                        UserId,
                        LocationId
                    )
                VALUES
                    ${unsafe(userObj.LocationIds.map(id => `(${escape(userObj.Id)}, ${escape(id)})`).join(','))}`
        }
    
        res.status(201).send(userObj)
    }
    catch(_error)
    {
        log.error(_error)
        error(res, 500, 'Unknown error')
    }
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

router.put('/:userId', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const userId    = Number.parseInt(req.params.userId)
    const companyId = token.getPayloadField('cid')

    const updateableProps: (keyof ApiUser)[] = [
        'UserRoleId',
        'FirstName',
        'MiddleName',
        'SurName',
        'ProfileImage',
        'HiredDate',
        'FiredDate',
        'LocationIds',
    ]

    const nullableProps: (keyof ApiUser)[] = [
        'MiddleName',
        'ProfileImage',
        'HiredDate',
        'FiredDate',
    ]

    // These are the updateable properties if the client is updating the tokens user
    const ownUpdateableProps: (keyof ApiUser)[] = [
        'FirstName',
        'MiddleName',
        'SurName',
        'ProfileImage',
    ]
    const isUpdatingSelf = token.getPayloadField('uid') === userId


    if(Number.isNaN(userId))
        return error(res, 400, 'Invalid URL')


    const user = await fetchUser(companyId, 'Id', userId).catch(_error =>
    {
        if(!(_error instanceof SQLNoResultError))
            throw _error

        log.warn(`No user with id=${userId}`)
        error(res, 404, 'User not found')
    })
    if(typeof user === 'undefined') return


    // Starts out as a copy of the original object
    const updatedUser: NullableifyObject<ApiUser> = Object.assign({}, user, { LocationIds: Array.from(user.LocationIds) })
    for(const field in updatedUser)
    {
        if(!updateableProps.includes(field as keyof ApiUser))
            delete updatedUser[field as keyof ApiUser]
    }

    // Replace any given fields in the "update" object
    for(const field in req.body)
    {
        if(!isValidKeyOf<ApiUser>(field, updateableProps))
            return error(res, 400, `Param "${field}" is not updateable or is otherwise invalid.`)

        if(isUpdatingSelf && !(field in ownUpdateableProps))
            return error(res, 400, `You cannot update "${field}" on yourself.`)

        const value = req.body[field]

        if(value === null)
        {
            if(nullableProps.includes(field))
            {
                updatedUser[field] = null
                continue
            }

            return error(res, 400, `Param "${field}" is not nullable. Omit the parameter if you wish not to update it.`)
        }
        
        switch(field)
        {
            case 'UserRoleId':
            case 'ProfileImage':
                updatedUser[field] = Number.parseInt(value)
                if(Number.isNaN(value))
                    return error(res, 400, `Param "${field}" is invalid (must be an integer).`)
                break

            case 'FirstName':
            case 'MiddleName':
            case 'SurName':
                updatedUser[field] = value
                if(!value.length)
                    return error(res, 400, `Param "${field}" is invalid (must be a non-empty string).`)
                break

            case 'FiredDate':
            case 'HiredDate':
                updatedUser[field] = Number.parseInt(value)
                if(Number.isNaN(value))
                    return error(res, 400, `Param "${field}" is invalid (must be an integer / unix timestamp).`)
                break

            case 'LocationIds':
                updatedUser.LocationIds = [] // Must be reset if changed
                if(!Array.isArray(value))
                    return error(res, 400, `Param "${field}" is invalid (must be an array of integers).`)
                for(const id of value.map(id => Number.parseInt(id)))
                {
                    if(Number.isNaN(id))
                        return error(res, 400, `Param "${field}" contains invalid entries (must contain only integers).`)

                    if(updatedUser[field]!.includes(id))
                        continue

                    updatedUser[field]!.push(id)
                }
                break
        }
    }


    if(updatedUser.HiredDate && updatedUser.FiredDate && updatedUser.FiredDate <= updatedUser.HiredDate)
        return error(res, 400, 'Param "FiredDate" cannot be on or after "HiredDate".')


    const permissionChecks = new Map<string, string>()
    if(updatedUser.LocationIds!.length)
    {
        permissionChecks.set('LocationIds', /*SQL*/`(
            SELECT
                COUNT(Id) = ${escape(updatedUser.LocationIds!.length)}
            FROM
                locations
            WHERE
                Id IN (${escape(updatedUser.LocationIds)})
                AND CompanyId = ${escape(companyId)}
        ) AS LocationIds `)
    }

    if(updatedUser.UserRoleId)
    {
        permissionChecks.set('UserRoleId', /*SQL*/`(
            ${escape(updatedUser.UserRoleId)} IN (
                SELECT
                    Id
                FROM
                    user_roles
                WHERE
                    CompanyId = ${escape(companyId)}
                    AND Id = ${escape(updatedUser.UserRoleId)}
            )
        ) AS UserRoleId `)
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

    updatedUser.FullName = [ updatedUser.FirstName, ...updatedUser.MiddleName ? [updatedUser.MiddleName] : [], updatedUser.SurName ].join(' ')

    const updateSet: string[]         = []
    const locationsToAdd: number[]    = []
    const locationsToRemove: number[] = []
    for(const field of updateableProps.concat(Object.keys(updatedUser) as (keyof ApiUser)[]).unique())
    {
        if(user[field] == null && updatedUser[field] == null)
        {
            log.info(`Skipped ${field} (null)`)
            continue
        }

        if(user[field] === updatedUser[field])
        {
            log.info(`Skipped ${field} (exact match)`)
            continue
        }

        switch(field)
        {
            case 'UserRoleId': // Strings and integers
            case 'FirstName':
            case 'MiddleName':
            case 'SurName':
            case 'FullName':
            case 'ProfileImage':
            case 'HiredDate':
            case 'FiredDate':
                if(updatedUser[field] == null)
                {
                    if(!nullableProps.includes(field))
                        return error(res, 500, `(unreachable?) The field "${field}" cannot be set to null.`)
        
                    updateSet.push(/*SQL*/`u.${field} = NULL`)
                }
                else
                {
                    updateSet.push(/*SQL*/`u.${field} = ${escape(updatedUser[field])}`)
                }
                break

            case 'LocationIds':
                locationsToAdd.push(...updatedUser.LocationIds!.filter(id => !user.LocationIds.includes(id)))
                locationsToRemove.push(...user.LocationIds.filter(id => !updatedUser.LocationIds!.includes(id)))
                break
        }
    }

    log.info(JSON.stringify({ updateSet, locationsToAdd, locationsToRemove }, null, 2))

    
    const queries = []
    if(updateSet.length)
    {
        queries.push(sql`
            UPDATE
                users AS u
            SET
                ${unsafe(updateSet.join(','))}
            WHERE
                u.Id = ${userId}
                AND u.CompanyId = ${companyId}
            LIMIT 1
        `)
    }

    if(locationsToAdd.length)
    {
        queries.push(sql`
            INSERT INTO
                x_user_locations
                ( UserId, LocationId )
            VALUES
                ${unsafe(locationsToAdd.map(id => /*SQL*/`(${escape(userId)},${escape(id)})`).join(','))}
        `)
    }

    if(locationsToRemove.length)
    {
        queries.push(sql`
            DELETE FROM
                x_user_locations
            WHERE
                UserId = ${userId}
                AND LocationId IN (${locationsToRemove})
            LIMIT ${locationsToRemove.length}
        `)
    }

    if(!queries.length) // No changes then
        return res.send(user)

    await Promise.all(queries).catch(_error =>
    {
        log.error(_error)
        return Promise.reject(_error)
    })

    res.send(await fetchUser(companyId, 'Id', userId))
})

router.delete('/:userId', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const companyId = token.getPayloadField('cid')
    const userId    = Number.parseInt(req.params.userId)

    if(Number.isNaN(userId))
        return error(res, 400, 'Invalid URL')

    if(userId == token.getPayloadField('uid'))
        return error(res, 400, 'You cannot delete yourself headass')

    try
    {
        const user = await fetchUser(companyId, 'Id', userId)
        
        const result = await sql`
            DELETE FROM
                users
            WHERE
                CompanyId = ${companyId}
                AND Id = ${user.Id}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Failed to delete user')

        log.silly(`User was deleted:\n${JSON.stringify(user, null, 2)}`)

        res.sendStatus(204)
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

    const requiredProps: (keyof ApiTimeEntryTypeCollection)[] = [
        'TimeEntryTypeId',
        'TimeTagIds',
    ]

    const optionalProps: (keyof ApiTimeEntryTypeCollection)[] = []

    // @ts-expect-error Im using this to build the object
    const collection: ApiTimeEntryTypeCollection = {
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
