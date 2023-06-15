import { Router, Request, Response } from 'express'
import { error, notAllowed, wsbroadcast } from '../../utils/common'
import { SQLNoResultError, fetchUser } from '../../utils/fetchfunctions'
import { sql } from '../../utils/database'
import log from '../../utils/Logger'
import permission from '../../middlewares/permission'
import { EUserRolePermission as URP } from '../../enums/userpermissions'

export default function(router: Router)
{
    router.delete('/:userId', permission.oneOf(URP.manage_all_users, URP.manage_location_users), async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const userId    = Number.parseInt(req.params.userId)

        if(Number.isNaN(userId))
            return error(res, 400, 'Invalid URL')

        if(userId == token.getPayloadField('uid'))
            return error(res, 400, 'You cannot delete yourself headass')

        try
        {
            const user = await fetchUser(companyId, 'Id', userId)

            if(!token.hasPermission(URP.manage_location_users))
            {
                const tokenUserLeaderOf = token.getPayloadField('llo')

                // Cannot delete users that are not part of the locations you have leadership of
                if(!tokenUserLeaderOf.intersect(user.LocationIds).length)
                    return notAllowed(res)

                // Cannot delete users who shares leadership over locations you also have leadership of
                if(tokenUserLeaderOf.intersect(user.LeaderOfIds).length)
                    return notAllowed(res)

                // TODO: Can this use be deleted if he is a leader of another location?
            }

            const result = await sql`
                DELETE FROM
                    users
                WHERE
                    CompanyId = ${companyId}
                    AND Id = ${user.Id}
                LIMIT 1`

            if(result.affectedRows < 1)
                return error(res, 500, 'Failed to delete user')

            log.silly(`User was deleted:\n${JSON.stringify(user, null, 2)}`)

            wsbroadcast(res, companyId, 'deleted', 'User', { Id: userId })
            res.sendStatus(204)
        }
        catch(_error)
        {
            if(!(_error instanceof SQLNoResultError))
                throw _error

            log.warn(`no user with id=${userId}`)
            error(res, 404, 'User not found')
        }
    })
}
