import { RequestHandler } from 'express'
import { EUserRolePermission as URP } from '../enums/userpermissions'
import { notAllowed } from '../utils/common'

export interface PermissionOptions {
    oneOf?: URP[]
    allOf?: URP[]
}

function createMiddleware(options: PermissionOptions): RequestHandler
{
    return (_, response, next) =>
    {
        const token = response.locals.accessToken!

        if(token.hasPermission(URP.superadmin))
            return next()

        if(options.allOf)
        {
            for(const permission of options.allOf)
            {
                if(!token.hasPermission(permission))
                    return notAllowed(response)
            }
        }

        if(options.oneOf)
        {
            let matched = false
            for(const permission of options.oneOf)
            {
                matched = token.hasPermission(permission)
                if(matched)
                    break
            }

            if(!matched)
                return notAllowed(response)
        }

        next()
    }
}

export default {
    custom: createMiddleware,
    oneOf:  (...permissions: (URP | URP[])[]) => createMiddleware({ oneOf: permissions.flat() }),
    allOf:  (...permissions: (URP | URP[])[]) => createMiddleware({ allOf: permissions.flat() }),
    has:    (permission: URP) => createMiddleware({ allOf: [permission] }),
}
