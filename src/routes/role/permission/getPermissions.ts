import { Router, Request, Response } from 'express'
import { error } from '../../../utils/common'
import { SQLNoResultError, fetchFullUserRole } from '../../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/:roleId/permission', async (req: Request, res: Response) =>
    {
        const token  = res.locals.accessToken!
        const roleId = Number.parseInt(req.params.roleId)

        if(Number.isNaN(roleId))
            return error(res, 400, 'Invalid URL')

        try
        {
            const role = await fetchFullUserRole(
                token.getPayloadField('cid'),
                roleId
            )

            res.send(role.Permissions)
        }
        catch(_error)
        {
            if(!(_error instanceof SQLNoResultError))
                throw _error

            error(res, 404, 'UserRole not found')
        }
    })
}
