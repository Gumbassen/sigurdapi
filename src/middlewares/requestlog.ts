import { RequestHandler } from 'express'
import log from '../utils/Logger'

export default function(): RequestHandler
{
    return (request, response, next) =>
    {
        if(request.url.startsWith('/swagger'))
            return next()

        if(Object.keys(request.body).length)
            log.http(`${request.socket.remoteAddress} -> [${request.method}] ${request.url}\nBody: `, request.body)
        else
            log.http(`${request.socket.remoteAddress} -> [${request.method}] ${request.url}`)
        next()
    }
}
