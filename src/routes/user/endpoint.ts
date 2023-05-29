
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'
import { SQLNoResultError, fetchFullUser, fetchUser, fetchUserLocations, fetchUsers } from '../../utils/fetchfunctions'

const router = express.Router()


router.get('/', async (req: Request, res: Response) =>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token = res.locals.accessToken!

    res.send(await fetchFullUser(
        token.getPayloadField('cid'),
        token.getPayloadField('uid'),
    ))
})

router.get('/:userId', async (req: Request, res: Response) =>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token  = res.locals.accessToken!
    const userId = Number.parseInt(req.params.userId)

    if(Number.isNaN(userId))
    {
        res.status(400).send('Invalid URL')
        return
    }

    try
    {
        res.send(await fetchUser(
            token.getPayloadField('cid'),
            'Id',
            userId,
        ))
    }
    catch(error)
    {
        if(!(error instanceof SQLNoResultError))
            throw error

        log.warn(`no user with id=${userId}`)
        res.sendStatus(404)
    }
})

router.get('/:userId/locations', async (req: Request, res: Response) =>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token  = res.locals.accessToken!
    const userId = Number.parseInt(req.params.userId)

    if(Number.isNaN(userId))
    {
        res.status(400).send('Invalid URL')
        return
    }

    try
    {
        res.send(Array.from((await fetchUserLocations(
            token.getPayloadField('cid'),
            [token.getPayloadField('uid')],
        )).values()))
    }
    catch(error)
    {
        if(!(error instanceof SQLNoResultError))
            throw error

        log.warn(`no user with id=${userId}`)
        res.sendStatus(404)
    }
})

export default endpoint(router, {})
