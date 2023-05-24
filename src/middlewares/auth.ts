import { NextFunction, Request, RequestHandler, Response } from 'express'
import Token from '../utils/token'
import log from '../utils/logger'



export default function(options: object): RequestHandler
{
    // Do stuff

    return function(req: Request, res: Response, next: NextFunction)
    {
        const header = req.header('Authorization')
        const token  = Token.fromAuthHeader(header)

        const verified = token.verify()

        log.info(`Authorization: ${header}\n${JSON.stringify(token, undefined, 3)}`)

        next()
    }
}
