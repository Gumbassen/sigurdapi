import { Router, Request, Response } from 'express'
import { error } from '../../../utils/common'
import { SQLNoResultError, fetchFullTimeEntryTypeCollection } from '../../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/:userId/tagcollections/:collectionId', async (req: Request, res: Response) =>
    {
        const token        = res.locals.accessToken!
        const userId       = Number.parseInt(req.params.userId)
        const collectionId = Number.parseInt(req.params.collectionId)

        if(Number.isNaN(userId) || Number.isNaN(collectionId))
            return error(res, 400, 'Invalid URL')

        try
        {
            const collection = await fetchFullTimeEntryTypeCollection(
                token.getPayloadField('cid'),
                collectionId
            )

            if(collection.UserId !== userId)
                return error(res, 404, 'Tag collection not found')

            res.send(collection)
        }
        catch(_error)
        {
            if(!(_error instanceof SQLNoResultError))
                throw _error

            error(res, 404, 'Tag collection not found')
        }
    })
}
