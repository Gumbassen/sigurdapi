import { Router, Request, Response } from 'express'
import { error } from '../../../utils/common'
import { fetchTimeEntryTypeCollections } from '../../../utils/fetchfunctions'
import { sql } from '../../../utils/database'
import log from '../../../utils/logger'

export default function(router: Router)
{
    router.delete('/:userId/tagcollections/:collectionId', async (req: Request, res: Response) =>
    {
        const token        = res.locals.accessToken!
        const companyId    = token.getPayloadField('cid')
        const userId       = Number.parseInt(req.params.userId)
        const collectionId = Number.parseInt(req.params.collectionId)

        if(Number.isNaN(userId) || Number.isNaN(collectionId))
            return error(res, 400, 'Invalid URL')

        const collections = await fetchTimeEntryTypeCollections(
            companyId,
            'Id',
            [collectionId]
        )

        if(!collections.has(collectionId))
            return error(res, 404, 'Tag collection not found')

        const collection = collections.get(collectionId)!

        if(collection.UserId !== userId)
            return error(res, 404, 'Tag collection not found')

        try
        {
            const result = await sql`
                DELETE FROM
                    time_entry_type_collections
                WHERE
                    CompanyId = ${companyId}
                    AND UserId = ${userId}
                    AND Id = ${collectionId}
                LIMIT 1`

            if(result.affectedRows < 1)
                return error(res, 500, 'Deletion failed')

            log.silly(`Deleted TimeEntryTypeCollection: Id=${collectionId}, UserId=${userId}, CompanyId=${companyId}`)

            res.sendStatus(204)
        }
        catch(_error)
        {
            error(res, 500, 'Deletion failed')

            throw _error
        }
    })
}
