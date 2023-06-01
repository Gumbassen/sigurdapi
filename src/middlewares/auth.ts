/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NextFunction, Request, RequestHandler, Response } from 'express'
import Token, { AccessToken, TokenExpiredError, TokenInvalidError, TokenMissingError } from '../utils/token'
import log from '../utils/logger'
import { EUserRolePermission } from '../utils/userpermissions'
import { pathToRegexp } from 'path-to-regexp'

export type InsecureFilterFunc = (request: Request) => boolean
export type AccessFilterFunc   = (request: Request, token: Token<AccessToken>) => boolean

export interface AuthMiddlewareOptions
{
    onInvalidHandler?:    RequestHandler
    onMissingHandler?:    RequestHandler
    onExpiredHandler?:    RequestHandler
    onNotAllowedHandler?: RequestHandler
    insecureFilter:       InsecureFilterFunc
    accessFilters:        { [ path: string ]: EUserRolePermission | AccessFilterFunc }
}

export default function(options: AuthMiddlewareOptions): RequestHandler
{
    const defaultHandler = (where: string, req: Request, res: Response) =>
    {
        log.warn(`Default handler for auth middleware was used in place of '${where}': ${req.url}`)
        res.sendStatus(401).end()
    }

    options.onInvalidHandler    ??= (rq, rs) => defaultHandler('invalid',    rq, rs)
    options.onMissingHandler    ??= (rq, rs) => defaultHandler('missing',    rq, rs)
    options.onExpiredHandler    ??= (rq, rs) => defaultHandler('expired',    rq, rs)
    options.onNotAllowedHandler ??= (rq, rs) => defaultHandler('notallowed', rq, rs)

    const accessFilters = new Map<RegExp, AccessFilterFunc>()
    for(const [ path, value ] of Object.entries(options.accessFilters))
    {
        const regexp = pathToRegexp(path)

        if(value instanceof Function)
        {
            accessFilters.set(regexp, value)
            continue
        }

        accessFilters.set(regexp, (request, token) =>
        {
            return true
        })
    }

    return function(req: Request, res: Response, next: NextFunction)
    {
        if(options.insecureFilter(req))
            return next()

        try
        {
            const token = Token.fromRequest(req)

            if(!token.verify() || !token.isOfType<AccessToken>('access'))
                return options.onInvalidHandler!(req, res, next)
            
            res.locals.accessToken = token
        }
        catch(error)
        {
            if(error instanceof TokenExpiredError)
                options.onExpiredHandler!(req, res, next)
            else if(error instanceof TokenInvalidError)
                options.onInvalidHandler!(req, res, next)
            else if(error instanceof TokenMissingError)
                options.onMissingHandler!(req, res, next)
            else
                defaultHandler('else', req, res)
        }

        for(const [ path, func ] of accessFilters.entries())
        {
            if(!path.test(req.url))
                continue

            if(!func(req, res.locals.accessToken!))
                return options.onNotAllowedHandler!(req, res, next)
        }

        next()
    }
}
