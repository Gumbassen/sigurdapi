import { Router, Request, Response } from 'express'
import { error } from '../../../utils/common'
import { fetchTimeEntryTypeCollections } from '../../../utils/fetchfunctions'

export default function(router: Router)
{
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
}
