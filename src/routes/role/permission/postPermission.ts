import { Router, Request, Response } from 'express'
import { error } from '../../../utils/common'
import { sql, sqlMulti } from '../../../utils/database'
import { SQLNoResultError } from '../../../utils/fetchfunctions'
import permission from '../../../middlewares/permission'
import { EUserRolePermission as URP } from '../../../enums/userpermissions'

export default function(router: Router)
{
    router.post('/:roleId/permission/:permissionId', permission.has(URP.manage_all_roles), async (req: Request, res: Response) =>
    {
        const token        = res.locals.accessToken!
        const companyId    = token.getPayloadField('cid')
        const roleId       = Number.parseInt(req.params.roleId)
        const permissionId = Number.parseInt(req.params.permissionId)

        if(Number.isNaN(roleId) || Number.isNaN(permissionId))
            return error(res, 400, 'Invalid URL')

        try
        {
            const [ roleAllowedResult, permissionsResult ] = await sqlMulti/*SQL*/`
                SELECT
                    (COUNT(ur.Id) != 0) AS IsAllowed
                FROM
                    user_roles AS ur
                WHERE
                    ur.CompanyId = ${companyId}
                    AND ur.Id = ${roleId};
                SELECT
                    urp.Id AS Id,
                    (urp.Id IN (
                        SELECT
                            xurp.UserRolePermissionId
                        FROM
                            x_user_role_permissions AS xurp
                        INNER JOIN user_roles AS ur ON
                            ur.Id = xurp.UserRoleId
                        WHERE
                            ur.CompanyId = ${companyId}
                            AND ur.Id = ${roleId}
                    )) AS IsLinked
                FROM
                    user_role_permissions AS urp;`

            if(!roleAllowedResult[0].IsAllowed)
                return error(res, 404, 'Unknown user role')

            const used = new Set<number>()
            const free = new Set<number>()
            for(const row of permissionsResult)
                (row.IsLinked ? used : free).add(row.Id)

            if(used.has(permissionId))
                return res.sendStatus(201)

            if(!free.has(permissionId))
                return error(res, 404, 'Unknown user role permission')

            await sql`
                INSERT INTO
                    x_user_role_permissions
                SET
                    UserRoleId           = ${roleId},
                    UserRolePermissionId = ${permissionId}`

            res.sendStatus(201)
        }
        catch(_error)
        {
            if(!(_error instanceof SQLNoResultError))
                throw _error

            error(res, 404, 'User role not found')
        }
    })
}
