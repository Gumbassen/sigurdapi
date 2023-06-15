import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { SQLNoResultError, fetchUserRole } from '../../utils/fetchfunctions'
import log from '../../utils/Logger'
import isValidKeyOf from '../../utils/helpers/isvalidkeyof'
import { escape, sql, unsafe } from '../../utils/database'
import permission from '../../middlewares/permission'
import { EUserRolePermission as URP } from '../../enums/userpermissions'

type ApiUserRole = ApiDataTypes.Objects.UserRole

export default function(router: Router)
{
    router.put('/:roleId', permission.has(URP.manage_all_roles), async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const roleId    = Number.parseInt(req.params.roleId)
        const companyId = token.getPayloadField('cid')

        const updateableProps: (keyof ApiUserRole)[] = [
            'Name',
            'Description',
            'PermissionIds',
        ]

        const nullableProps: (keyof ApiUserRole)[] = ['Description']


        if(Number.isNaN(roleId))
            return error(res, 400, 'Invalid URL')


        const role = await fetchUserRole(companyId, roleId).catch(_error =>
        {
            if(!(_error instanceof SQLNoResultError))
                throw _error

            log.warn(`No user with id=${roleId}`)
            error(res, 404, 'User not found')
        })
        if(typeof role === 'undefined') return


        // Starts out as a copy of the original object
        const updatedRole: NullableifyObject<ApiUserRole> = Object.assign({}, role, { PermissionIds: Array.from(role.PermissionIds) })
        for(const field in updatedRole)
        {
            if(!updateableProps.includes(field as keyof ApiUserRole))
                delete updatedRole[field as keyof ApiUserRole]
        }

        // Replace any given fields in the "update" object
        for(const field in req.body)
        {
            if(!isValidKeyOf<ApiUserRole>(field, updateableProps))
                return error(res, 400, `Param "${field}" is not updateable or is otherwise invalid.`)

            const value = req.body[field]

            if(value === null)
            {
                if(nullableProps.includes(field))
                {
                    updatedRole[field] = null
                    continue
                }

                return error(res, 400, `Param "${field}" is not nullable. Omit the parameter if you wish not to update it.`)
            }

            switch(field)
            {
                case 'Name':
                case 'Description':
                    updatedRole[field] = value
                    if(!value.length)
                        return error(res, 400, `Param "${field}" is invalid (must be a non-empty string).`)
                    break

                case 'PermissionIds':
                    updatedRole.PermissionIds = [] // Must be reset if changed
                    if(!Array.isArray(value))
                        return error(res, 400, `Param "${field}" is invalid (must be an array of integers).`)
                    for(const id of value.map(id => Number.parseInt(id)))
                    {
                        if(Number.isNaN(id))
                            return error(res, 400, `Param "${field}" contains invalid entries (must contain only integers).`)

                        if(updatedRole[field]!.includes(id))
                            continue

                        updatedRole[field]!.push(id)
                    }
                    break
            }
        }


        const permissionChecks = new Map<string, string>()
        if(!updatedRole.PermissionIds!.equals(role.PermissionIds) && updatedRole.PermissionIds?.length)
        {
            permissionChecks.set('PermissionIds', /*SQL*/`(
                SELECT
                    COUNT(Id) = ${escape(updatedRole.PermissionIds!.length)}
                FROM
                    user_role_permissions
                WHERE
                    Id IN (${escape(updatedRole.PermissionIds)})
            ) AS PermissionIds `)
        }

        if(updatedRole.Name !== role.Name)
        {
            permissionChecks.set('Name', /*SQL*/`(
                ${escape(updatedRole.Name)} IN (
                    SELECT
                        Name
                    FROM
                        user_roles
                    WHERE
                        CompanyId = ${escape(companyId)}
                        AND Name = ${escape(updatedRole.Name)}
                )
            ) AS Name `)
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

        const updateSet: string[]     = []
        const permsToAdd: number[]    = []
        const permsToRemove: number[] = []
        for(const field of updateableProps)
        {
            if(role[field] == null && updatedRole[field] == null)
                continue

            if(role[field] === updatedRole[field])
                continue

            switch(field)
            {
                case 'Name':          // Strings and integers
                case 'Description': 
                    if(updatedRole[field] == null)
                    {
                        if(!nullableProps.includes(field))
                            return error(res, 500, `(unreachable?) The field "${field}" cannot be set to null.`)

                        updateSet.push(/*SQL*/`ur.${field} = NULL`)
                    }
                    else
                    {
                        updateSet.push(/*SQL*/`ur.${field} = ${escape(updatedRole[field])}`)
                    }
                    break

                case 'PermissionIds':
                    permsToAdd.push(...updatedRole.PermissionIds!.intersect(role.PermissionIds))
                    permsToRemove.push(...role.PermissionIds.intersect(updatedRole.PermissionIds!))
                    break
            }
        }


        const queries = []
        if(updateSet.length)
        {
            queries.push(sql`
                UPDATE
                    user_roles AS ur
                SET
                    ${unsafe(updateSet.join(','))}
                WHERE
                    ur.Id = ${roleId}
                    AND ur.CompanyId = ${companyId}
                LIMIT 1
            `)
        }

        if(permsToAdd.length)
        {
            queries.push(sql`
                INSERT INTO
                    x_user_role_permissions
                    ( UserRoleId, UserRolePermissionId )
                VALUES
                    ${unsafe(permsToAdd.map(id => /*SQL*/`(${escape(roleId)},${escape(id)})`).join(','))}
            `)
        }

        if(permsToRemove.length)
        {
            queries.push(sql`
                DELETE FROM
                    x_user_role_permissions
                WHERE
                    UserRoleId = ${roleId}
                    AND UserRolePermissionId IN (${permsToRemove})
                LIMIT ${permsToRemove.length}
            `)
        }

        if(!queries.length) // No changes then
            return res.send(role)

        await Promise.all(queries).catch(_error =>
        {
            log.error(_error)
            return Promise.reject(_error)
        })

        const fetched = await fetchUserRole(companyId, roleId)
        wsbroadcast(res, companyId, 'updated', 'UserRole', fetched)
        res.send(fetched)
    })
}
