import { Response } from 'express'
import log from './logger'

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

    log.debug(`Returning an error response: ${JSON.stringify(data, null, 2)}`)

    response.status(status).send(data)
}




