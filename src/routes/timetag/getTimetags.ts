import { Router, Request, Response } from 'express'
import { fetchTimetags } from '../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/', async (req: Request, res: Response) =>
    {
        const token = res.locals.accessToken!

        res.send(Array.from((await fetchTimetags(
            token.getPayloadField('cid')
        )).values()))
    })
}
