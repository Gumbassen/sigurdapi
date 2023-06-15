import { Router, Request, Response } from 'express'
import { error, notAllowed, wsbroadcast } from '../../../utils/common'
import { SQLNoResultError, fetchTimeEntryTypeCollections, fetchUser } from '../../../utils/fetchfunctions'
import { sql } from '../../../utils/database'
import log from '../../../utils/Logger'
import permission from '../../../middlewares/permission'
import { EUserRolePermission as URP } from '../../../enums/userpermissions'

export default function(router: Router)
{
    router.delete('/:userId/tagcollections/:collectionId', permission.oneOf(URP.manage_all_users, URP.manage_location_users), async (req: Request, res: Response) =>
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

        if(!token.hasPermission(URP.manage_all_users))
        {
            const tokenUserLeaderOf = token.getPayloadField('llo')
            try
            {
                const user = await fetchUser(companyId, 'Id', userId)

                // Cannot change users that are not part of the locations you have leadership of
                if(!tokenUserLeaderOf.intersect(user.LocationIds).length)
                    return notAllowed(res)

                // Cannot change users who shares leadership over locations you also have leadership of
                if(tokenUserLeaderOf.intersect(user.LeaderOfIds).length)
                    return notAllowed(res)

                // TODO: Can this use be changed if he is a leader of another location?
            }
            catch(_error)
            {
                if(!(_error instanceof SQLNoResultError))
                    throw _error

                return error(res, 404, 'User not found')
            }
        }

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

            wsbroadcast(res, companyId, 'deleted', 'TimeEntryTypeCollection', { Id: collectionId })
            res.sendStatus(204)
        }
        catch(_error)
        {
            error(res, 500, 'Deletion failed')

            throw _error
        }
    })
}
