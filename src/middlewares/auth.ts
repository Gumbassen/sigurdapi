/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NextFunction, Request, RequestHandler, Response } from 'express'
import Token, { AccessToken, TokenExpiredError, TokenInvalidError, TokenMissingError } from '../utils/token'
import log from '../utils/logger'
import { EUserRolePermission } from '../utils/userpermissions'
import { pathToRegexp } from 'path-to-regexp'
import { error } from '../utils/common'

export type InsecureFilterFunc = (request: Request) => boolean
export type AccessFilterFunc   = (request: Request, token: Token<AccessToken>) => Nullable<boolean>
export type HTTPMethod         = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
interface AccessFilterOption_Func {
    path:   string
    filter: AccessFilterFunc
}
interface AccessFilterOption_MethodAndPermission {
    path:       string
    method:     HTTPMethod | HTTPMethod[]
    permission: EUserRolePermission | EUserRolePermission[]
}
export type AccessFilterOption = AccessFilterOption_Func | AccessFilterOption_MethodAndPermission

export interface AuthMiddlewareOptions
{
    onInvalidHandler?:    RequestHandler
    onMissingHandler?:    RequestHandler
    onExpiredHandler?:    RequestHandler
    onNotAllowedHandler?: RequestHandler
    insecureFilter:       InsecureFilterFunc
    accessFilters:        AccessFilterOption[]
}

export default function(options: AuthMiddlewareOptions): RequestHandler
{
    const defaultHandler = (where: string, req: Request, res: Response) =>
    {
        log.warn(`Default handler for auth middleware was used in place of '${where}': ${req.url}`)
        error(res, 401, `Not allowed. Reason: ${where}`)
        res.end()
    }

    options.onInvalidHandler    ??= (rq, rs) => defaultHandler('invalid',    rq, rs)
    options.onMissingHandler    ??= (rq, rs) => defaultHandler('missing',    rq, rs)
    options.onExpiredHandler    ??= (rq, rs) => defaultHandler('expired',    rq, rs)
    options.onNotAllowedHandler ??= (rq, rs) => defaultHandler('notallowed', rq, rs)

    const accessFilters = new Map<RegExp, AccessFilterFunc>()
    for(const value of options.accessFilters)
    {
        const regexp = pathToRegexp(value.path)

        if('filter' in value)
        {
            accessFilters.set(regexp, value.filter)
            continue
        }

        const filterMethods     = Array.isArray(value.method)     ? value.method     : [value.method]
        const filterPermissions = Array.isArray(value.permission) ? value.permission : [value.permission]
        accessFilters.set(regexp, (req, token) =>
        {
            if(!filterMethods.includes(req.method as HTTPMethod))
                return null

            const userPerms = token.getPayloadField('prm')
            for(const perm of filterPermissions)
            {
                if(userPerms.includes(perm))
                    return true
            }
            return false
        })
    }

    return function(req: Request, res: Response, next: NextFunction)
    {
        if(options.insecureFilter(req))
            return next()

        let token: Token
        try
        {
            token = Token.fromRequest(req)
        }
        catch(error)
        {
            if(error instanceof TokenExpiredError)
                return options.onExpiredHandler!(req, res, next)
            if(error instanceof TokenInvalidError)
                return options.onInvalidHandler!(req, res, next)
            if(error instanceof TokenMissingError)
                return options.onMissingHandler!(req, res, next)

            log.error(error)
            return defaultHandler('unknown', req, res)
        }

        if(!token.verify())
            return options.onInvalidHandler!(req, res, next)

        if(!token.isOfType<AccessToken>('access'))
            return error(res, 401, 'Refresh tokens cannot be used as access tokens (refresh tokens should only be used to generate new access tokens).')

        if(!token.getPayloadField('prm').includes(EUserRolePermission.superadmin))
        {
            for(const [ path, func ] of accessFilters.entries())
            {
                if(!path.test(req.url))
                    continue

                const allowed = func(req, token)
                if(allowed === null)
                    continue

                if(allowed === true)
                    break
    
                return options.onNotAllowedHandler!(req, res, next)
            }
        }

        res.locals.accessToken = token
        next()
    }
}
