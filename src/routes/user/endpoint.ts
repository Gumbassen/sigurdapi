
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

const router = express.Router()


router.get('/', async (req: Request, res: Response) =>
{
    const token = res.locals.accessToken!

    res.send(Array.from((await fetchUsers(
        token.getPayloadField('cid'),
        'CompanyId',
        [token.getPayloadField('cid')],
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

export default endpoint(router, {})
