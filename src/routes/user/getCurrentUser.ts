import { Router, Request, Response } from 'express'
import { fetchFullUser } from '../../utils/fetchfunctions'

export default function(router: Router)
{
    // Must be added before any '/:userId' handler, otherwise the other one takes priority
    router.get('/current', async (req: Request, res: Response) =>
    {
        const token = res.locals.accessToken!

        res.send(await fetchFullUser(
            token.getPayloadField('cid'),
            token.getPayloadField('uid'),
        ))
    })
}
