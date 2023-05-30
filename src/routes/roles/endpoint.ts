
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import { SQLNoResultError, fetchAllUserRolePermissions, fetchUserRolePermissions } from '../../utils/fetchfunctions'
import { error } from '../../utils/common'

const router = express.Router()

router.get('/permission', async (req: Request, res: Response) =>
{
    res.send(Array.from((await fetchAllUserRolePermissions()).values()))
})

router.get('/permission/:permissionId', async (req: Request, res: Response) =>
{
    const token        = res.locals.accessToken!
    const permissionId = Number.parseInt(req.params.permissionId)

    if(Number.isNaN(permissionId))
        return error(res, 400, 'Invalid URL')

    try
    {
        const permissions = await fetchUserRolePermissions(
            token.getPayloadField('cid'),
            'PermissionId',
            [permissionId]
        )

        if(!permissions.has(permissionId))
            return error(res, 404, 'Permission not found')

        res.send(permissions.get(permissionId)!)
    }
    catch(_error)
    {
        if(!(_error instanceof SQLNoResultError))
            throw _error

        error(res, 404, 'Permission not found')
    }
})

export default endpoint(router, {})
