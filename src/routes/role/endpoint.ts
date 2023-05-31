
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import { SQLNoResultError, fetchFullUserRole, fetchUserRoles } from '../../utils/fetchfunctions'
import { error } from '../../utils/common'
import { escape, sql, unsafe } from '../../utils/database'
import log from '../../utils/logger'

const router = express.Router()

router.get('/', async (req: Request, res: Response) =>
{
    const token = res.locals.accessToken!

    res.send(Array.from((await fetchUserRoles(
        token.getPayloadField('cid')
    )).values()))
})

router.post('/', async (req: Request, res: Response) =>
{
    const requiredProps: (keyof ApiDataTypes.Objects.UserRole)[] = [
        'Name',
        'PermissionIds',
    ]

    const optionalProps: (keyof ApiDataTypes.Objects.UserRole)[] = ['Description']

    // @ts-expect-error Im using this to build the object
    const roleObj: ApiDataTypes.Objects.UserRole = {
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
                COUNT(Id) = 0
            FROM
                user_roles
            WHERE
                CompanyId = ${escape(roleObj.CompanyId)}
                AND Name = ${escape(roleObj.Name)}
        ) AS Name `)
    }

    if(roleObj.PermissionIds)
    {
        permissionChecks.set('PermissionIds', /*SQL*/`(
            ${escape(roleObj.PermissionIds)} IN (
                SELECT
                    Id
                FROM
                    time_entry_types
                WHERE
                    CompanyId = ${escape(roleObj.CompanyId)}
                    AND Id IN (${escape(roleObj.PermissionIds)})
            )
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
    
        res.status(201).send(roleObj)
    }
    catch(_error)
    {
        log.error(_error)
        error(res, 500, 'Unknown error')
    }
})

router.get('/:roleId', async (req: Request, res: Response) =>
{
    const token  = res.locals.accessToken!
    const roleId = Number.parseInt(req.params.roleId)

    if(Number.isNaN(roleId))
        return error(res, 400, 'Invalid URL')

    try
    {
        res.send(await fetchFullUserRole(
            token.getPayloadField('cid'),
            roleId,
        ))
    }
    catch(_error)
    {
        if(!(_error instanceof SQLNoResultError))
            throw _error

        error(res, 404, 'UserRole not found')
    }
})

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

export default endpoint(router, {})
