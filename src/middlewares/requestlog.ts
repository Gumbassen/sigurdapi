import { RequestHandler } from 'express'
import log from '../utils/logger'

export default function(): RequestHandler
{
    return (request, response, next) =>
    {
        if(request.url.startsWith('/swagger'))
            return next()

        log.http(`[${request.method}] ${request.url}\nBody: `, request.body)
        next()
    }
}
