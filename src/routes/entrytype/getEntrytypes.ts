import { Router, Request, Response } from 'express'
import { fetchTimeEntryTypes } from '../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')

        res.send(Array.from((await fetchTimeEntryTypes(companyId)).values()))
    })
}
