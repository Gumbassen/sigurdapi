/* eslint-disable no-use-before-define */

import { WebSocketServer, ServerOptions } from 'ws'
import log from '../utils/Logger'
import { WSClient } from './WSClient'
import { TokenError } from '../utils/Token/TokenErrors'
import { RequestHandler } from 'express'
import { WSClientActionMessage } from './WSClientMessages'


let wsserver: WebSocketServer | undefined

export function initialize(options?: ServerOptions): Promise<WebSocketServer>
{
    return new Promise(resolve =>
    {
        const configure = () =>
        {
            wsserver!.on('connection', (socket, request) =>
            {
                log.verbose(`New connection! ${request.socket.remoteAddress}`)
                WSClient.createClient(socket, request).then(client =>
                {
                    client.on('error', error =>
                    {
                        log.error('WSClient error:', error)
                    })
                }).catch(error =>
                {
                    if(!(error instanceof TokenError))
                        throw error
    
                    log.error('Failed to create client: ', error)
                })
            })

            resolve(wsserver!)
        }

        wsserver = new WebSocketServer(options, configure)
        if(!options?.port) configure()
    })
}

function wsbroadcast(message: WSClientActionMessage): void
{
    if(wsserver === undefined)
        throw new Error('The websocket server has not yet been initialized')

    log.verbose('[WEBSOCKET] Broadcast', message)

    for(const client of WSClient.getClientsForCompanyId(message.companyId))
        client.send(message)
}

export function middleware(): RequestHandler
{
    return (request, response, next) =>
    {
        if(wsserver === undefined)
        {
            const message = 'The websocket server has not yet been initialized'
            log.error(message)
            return next(new Error(message))
        }

        response.locals.wss         = wsserver
        response.locals.wsbroadcast = wsbroadcast
        next()
    }
}

export default {
    initialize,
    middleware,
}
