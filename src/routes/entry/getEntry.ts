import { Router, Request, Response } from 'express'
import { error } from '../../utils/common'
import { fetchTimeEntry } from '../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/:entryId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const entryId   = Number.parseInt(req.params.entryId)

        if(Number.isNaN(entryId))
            return error(res, 400, 'Invalid URL')

        const entry = await fetchTimeEntry(companyId, entryId, false)
        if(!entry) return error(res, 404, 'Time entry not found')
        res.send(entry)
    })
}
