import { Router, Request, Response } from 'express'
import { error } from '../../utils/common'
import { fetchTimeEntries } from '../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/:entryId', async (req: Request, res: Response) =>
    {
        const token   = res.locals.accessToken!
        const entryId = Number.parseInt(req.params.entryId)

        if(Number.isNaN(entryId))
            return error(res, 400, 'Invalid URL')

        const entries = await fetchTimeEntries(
            token.getPayloadField('cid'),
            [{ field: 'Id', value: [entryId] }]
        )

        if(!entries.has(entryId))
            return error(res, 404, 'Time entry not found')

        res.send(entries.get(entryId)!)
    })
}
