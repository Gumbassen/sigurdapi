import { Router, Request, Response } from 'express'
import { error } from '../../../utils/common'
import { SQLNoResultError, fetchUserRolePermissions } from '../../../utils/fetchfunctions'
import log from '../../../utils/logger'

export default function(router: Router)
{
    router.get('/:userId/permissions', async (req: Request, res: Response) =>
    {
        const token  = res.locals.accessToken!
        const userId = Number.parseInt(req.params.userId)

        if(Number.isNaN(userId))
            return error(res, 400, 'Invalid URL')

        try
        {
            res.send(Array.from((await fetchUserRolePermissions(
                token.getPayloadField('cid'),
                'UserId',
                [userId],
            )).values()))
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
