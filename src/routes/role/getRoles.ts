import { Router, Request, Response } from 'express'
import { fetchUserRoles } from '../../utils/fetchfunctions'

export default function(router: Router)
{    
    router.get('/', async (req: Request, res: Response) =>
    {
        const token = res.locals.accessToken!

        res.send(Array.from((await fetchUserRoles(
            token.getPayloadField('cid')
        )).values()))
    })
}
