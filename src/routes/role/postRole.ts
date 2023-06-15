import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { escape, sql, unsafe } from '../../utils/database'
import log from '../../utils/Logger'
import permission from '../../middlewares/permission'
import { EUserRolePermission as URP } from '../../enums/userpermissions'

type ApiUserRole = ApiDataTypes.Objects.UserRole

export default function(router: Router)
{
    router.post('/', permission.has(URP.manage_all_roles), async (req: Request, res: Response) =>
    {
        const requiredProps: (keyof ApiUserRole)[] = [
            'Name',
            'PermissionIds',
        ]

        const optionalProps: (keyof ApiUserRole)[] = ['Description']

        // @ts-expect-error Im using this to build the object
        const roleObj: ApiUserRole = {
            CompanyId:     res.locals.accessToken!.getPayloadField('cid'),
            PermissionIds: [],
        }

        for(const field of requiredProps.concat(optionalProps))
        {
            if(!(field in req.body) || req.body[field] === null)
            {
                if(optionalProps.includes(field))
                    continue

                return error(res, 400, `Param "${field}" is required.`)
            }

            const value = req.body[field]
            switch(field)
            {
                case 'Name':
                case 'Description':
                    if(!value.length)
                        return error(res, 400, `Param "${field}" cannot be empty.`)
                    roleObj[field] = value
                    break

                case 'PermissionIds':
                    if(!Array.isArray(value))
                        return error(res, 400, `Param "${field}" must be an array.`)
                    for(const id of value.map(id => Number.parseInt(id)))
                    {
                        if(Number.isNaN(id))
                            return error(res, 400, `Param "${field}" contains invalid entries.`)

                        if(roleObj.PermissionIds.includes(id))
                            continue

                        roleObj.PermissionIds.push(id)
                    }
                    break
            }
        }


        const permissionChecks = new Map<string, string>()
        if(roleObj.Name)
        {
            permissionChecks.set('Name', /*SQL*/`(
                SELECT
                    COUNT(ur.Id) = 0
                FROM
                    user_roles AS ur
                WHERE
                    ur.CompanyId = ${escape(roleObj.CompanyId)}
                    AND ur.Name = ${escape(roleObj.Name)}
            ) AS Name `)
        }

        if(roleObj.PermissionIds)
        {
            permissionChecks.set('PermissionIds', /*SQL*/`(
                SELECT
                    COUNT(urp.Id) = ${escape(roleObj.PermissionIds.length)}
                FROM
                    user_role_permissions AS urp
                WHERE
                    urp.Id IN (${escape(roleObj.PermissionIds)})
            ) AS PermissionIds `)
        }

        if(permissionChecks.size)
        {
            const result = await sql`SELECT ${unsafe(Array.from(permissionChecks.values()).join(','))}`

            for(const prop of permissionChecks.keys())
            {
                if(result[0][prop] !== 1)
                    return error(res, 400, `Param "${prop}" is invalid.`)
            }
        }

        try
        {
            const result = await sql`
                INSERT INTO
                    user_roles
                SET
                    CompanyId   = ${roleObj.CompanyId},
                    Name        = ${roleObj.Name},
                    Description = ${roleObj.Description ?? null}`

            roleObj.Id = result.insertId

            log.silly(`User role was created:\n${JSON.stringify(roleObj, null, 2)}`)

            if(roleObj.PermissionIds.length)
            {
                await sql`
                    INSERT INTO
                        x_user_role_permissions
                        (
                            UserRoleId,
                            UserRolePermissionId
                        )
                    VALUES
                        ${unsafe(roleObj.PermissionIds.map(id => `(${escape(roleObj.Id)}, ${escape(id)})`).join(','))}`
            }

            wsbroadcast(res, roleObj.CompanyId, 'created', 'UserRole', roleObj)
            res.status(201).send(roleObj)
        }
        catch(_error)
        {
            log.error(_error)
            error(res, 500, 'Unknown error')
        }
    })
}
