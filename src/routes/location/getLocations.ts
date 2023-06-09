import { Router, Request, Response } from 'express'
import { fetchLocations } from '../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/', async (req: Request, res: Response) =>
    {
        const token = res.locals.accessToken!

        res.send(Array.from((await fetchLocations(
            token.getPayloadField('cid')
        )).values()))
    })
}
