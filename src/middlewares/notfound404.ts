import { RequestHandler } from 'express'
import { error } from '../utils/common'
import log from '../utils/Logger'

export default function(): RequestHandler
{
    return (request, response) =>
    {
        try
        {
            const url = new URL(request.url, `${request.protocol}://${request.headers.host ?? `127.0.0.1:${request.socket.localPort}`}`)
            error(response, 404, `Cannot ${request.method} ${url.pathname}`)
        }
        catch(_error)
        {
            log.error('Failed to create URL for 404 request', _error)
            error(response, 404, `Cannot ${request.method} this URL`)
        }
    }
}
