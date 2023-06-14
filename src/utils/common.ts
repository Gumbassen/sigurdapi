import { Response } from 'express'
import log from './logger'
import { WSClientActionMessage, WSClientMessageTypes } from '../wsserver/WSClient'

export function unauthorized(response: Response, message?: string): void
{
    if(message)
    {
        const data: ApiDataTypes.Responses.ErrorResponse = {
            ErrorCode: -1,
            Reason:    message,
        }

        response.status(401).send(data)
        return
    }

    response.sendStatus(401)
}

export function error(response: Response, status: number, message: string, code?: number): void
{
    const data: ApiDataTypes.Responses.ErrorResponse = {
        ErrorCode: code ?? -1,
        Reason:    message,
    }

    log.debug(`Returning an error response [${status}]:`, data)

    response.status(status).send(data)
}

/**
 * @param companyId The company ID that this message is broadcasted to.
 * @param action    How the "model" has changed.
 * @param name      Name of the "model" that is changed.
 * @param data      The updated data as it would have been returned from the REST API.  
 *                  If the action is "deleted", then this should be undefined.
 */
export function wsbroadcast(
    response:  Response,
    companyId: WSClientActionMessage['companyId'],
    action:    WSClientActionMessage['action'],
    name:      WSClientActionMessage['name'],
    data:      WSClientActionMessage['data']
): void
{
    response.locals.wsbroadcast({
        type: WSClientMessageTypes.action,
        url:  response.req.originalUrl,
        companyId,
        action,
        data,
        name,
    })
}
