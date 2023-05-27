
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'
import { fetchFullUser, fetchUsers } from '../../utils/fetchfunctions'

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

router.get('/:userId', (req: Request, res: Response) =>
{
    const message = `Stub ${req.method} handler for "${req.baseUrl + req.url}"`
    log.info(message)
    res.send(message)
})

export default endpoint(router, {})
