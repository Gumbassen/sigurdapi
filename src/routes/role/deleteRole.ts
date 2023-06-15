import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { fetchUserRoles } from '../../utils/fetchfunctions'
import { sql } from '../../utils/database'
import log from '../../utils/Logger'

export default function(router: Router)
{
    router.delete('/:roleId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const roleId    = Number.parseInt(req.params.roleId)

        if(Number.isNaN(roleId))
            return error(res, 400, 'Invalid URL')

        const role = (await fetchUserRoles(companyId, 'Id', [roleId])).get(roleId)

        if(typeof role === 'undefined')
            return error(res, 404, 'User role not found')

        const result = await sql`
            DELETE FROM
                user_roles
            WHERE
                CompanyId = ${companyId}
                AND Id = ${role.Id}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Failed to delete user role')

        log.silly(`User role was deleted:\n${JSON.stringify(role, null, 2)}`)

        wsbroadcast(res, companyId, 'deleted', 'UserRole', { Id: roleId })
        res.sendStatus(204)
    })
}
