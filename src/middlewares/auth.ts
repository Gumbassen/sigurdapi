/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NextFunction, Request, RequestHandler, Response } from 'express'
import Token, { TokenExpiredError, TokenInvalidError, TokenMissingError } from '../utils/token'
import log from '../utils/logger'


export interface AuthMiddlewareOptions
{
    onInvalidHandler?: RequestHandler
    onMissingHandler?: RequestHandler
    onExpiredHandler?: RequestHandler
    insecureFilter: (request: Request) => boolean
}

export default function(options: AuthMiddlewareOptions): RequestHandler
{
    const defaultHandler = (where: string, req: Request, res: Response) =>
    {
        log.warn(`Default handler for auth middleware was used in place of '${where}': ${req.url}`)
        res.sendStatus(401).end()
    }

    options.onInvalidHandler ??= (rq, rs) => defaultHandler('invalid', rq, rs)
    options.onMissingHandler ??= (rq, rs) => defaultHandler('missing', rq, rs)
    options.onExpiredHandler ??= (rq, rs) => defaultHandler('expired', rq, rs)

    return function(req: Request, res: Response, next: NextFunction)
    {
        if(options.insecureFilter(req))
        {
            next()
            return
        }

        try
        {
            if(Token.fromRequest(req).verify())
            {
                next()
                return
            }

            options.onInvalidHandler!(req, res, next)
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
    }
}
