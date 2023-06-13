import { WSClient } from './WSClient'

export interface WSClientUnknownErrorData {
    type: 'UNKNOWN'
}

export interface WSClientWebsocketErrorData {
    type: 'WEBSOCKET_ERROR'
}

export interface WSClientBinaryMessageErrorData {
    type: 'MESSAGE_IS_BINARY'
}

export interface WSClientJSONParseErrorData {
    type: 'JSON_PARSE_ERROR'
}

export interface WSClientMessageTypeInvalidErrorData {
    type: 'MESSAGE_TYPE_INVALID'
}

export interface WSClientAuthorizationFailedErrorData {
    type: 'AUTH_FAILED'
}

export type WSClientErrorData = WSClientUnknownErrorData
    | WSClientWebsocketErrorData
    | WSClientBinaryMessageErrorData
    | WSClientJSONParseErrorData
    | WSClientMessageTypeInvalidErrorData
    | WSClientAuthorizationFailedErrorData

export class WSClientError<T, D extends WSClientErrorData> extends Error
{
    public data:      D
    public previous?: T

    public constructor(client: WSClient, data: D, previous?: T, message?: string)
    {
        super(`WebSocket Client#${client.getUid()} error from ${client.getRemoteAddress()}: ${message}`)
        this.data     = data
        this.previous = previous
    }
}
