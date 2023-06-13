/* eslint-disable no-use-before-define */

import { WebSocket, RawData } from 'ws'
import EventEmitter from 'events'
import Token, { AccessToken, TokenInvalidError } from '../utils/token'
import { IncomingMessage } from 'http'
import { getNamedLogger } from '../utils/logger'
import { WSClientError } from './WSClientError'

const log = getNamedLogger('WSCLIENT')

export type WSClientMap = {
    [_: WSClient['uid']]: WSClient
}

export enum WSClientMessageTypes {
    ping      = 'ping',
    action    = 'action',
    authorize = 'authorize',
}

export interface WSClientBaseMessage {
    type: WSClientMessageTypes
}

export interface WSClientPingMessage extends WSClientBaseMessage {
    type: WSClientMessageTypes.ping
}

export enum WSClientActionModelNames {
    TimeEntry               = 'TimeEntry',
    TimeEntryTypeCollection = 'TimeEntryTypeCollection',
    TimeEntryType           = 'TimeEntryType',
    User                    = 'User',
    TimeTag                 = 'TimeTag',
    UserRole                = 'UserRole',
    Location                = 'Location',
    TimeTagRule             = 'TimeTagRule',
    TimeEntryMessage        = 'TimeEntryMessage',
}

export interface WSClientActionMessage extends WSClientBaseMessage {
    /**
     * The message type.
     */
    type: WSClientMessageTypes.action

    /**
     * The company ID that this message is broadcasted to.
     */
    companyId: number

    /**
     * How the "model" has changed.
     */
    action: 'created' | 'deleted' | 'updated' | 'other'

    /**
     * Name of the "model" that is changed.
     */
    name: WSClientActionModelNames | keyof typeof WSClientActionModelNames

    /**
     * The URL that triggered this broadcast.
     */
    url: string

    /**
     * The updated data as it would have been returned from the REST API.
     * 
     * If the action is "deleted", then this will be undefined.
     */
    data: unknown
}

export interface WSClientAuthorizeMessage {
    /**
     * The message type.
     */
    type: WSClientMessageTypes.authorize

    /**
     * The token to authorize with.
     */
    token: string
}

export type WSClientMessage = WSClientPingMessage
    | WSClientActionMessage
    | WSClientAuthorizeMessage

declare type TAccess              = Token<AccessToken>
declare type AuthorizedWSClient   = WSClient<TAccess>
declare type UnauthorizedWSClient = WSClient<undefined>

export class WSClient<T extends TAccess | undefined = TAccess | undefined> extends EventEmitter
{
    private static clientUidCounter     = 0
    private static clients: WSClientMap = {}

    private static isClientAuthorized<T extends TAccess | undefined>(client: WSClient, cond: T extends undefined ? true : false): client is WSClient<T>
    {
        return typeof client.token === 'undefined' === cond
    }

    public static *getAuthorizedClients(): Generator<AuthorizedWSClient>
    {
        for(const uid in this.clients)
        {
            const client = this.clients[uid]
            if(this.isClientAuthorized<TAccess>(client, false))
                yield client
        }
    }

    public static *getUnauthorizedClients(): Generator<UnauthorizedWSClient>
    {
        for(const uid in this.clients)
        {
            const client = this.clients[uid]
            if(this.isClientAuthorized<undefined>(client, true))
                yield client
        }
    }

    public static *getClientsForCompanyId(companyId: number): Generator<AuthorizedWSClient>
    {
        for(const client of this.getAuthorizedClients())
        {
            if(client.token.getPayloadField('cid') !== companyId)
                continue

            yield client
        }
    }

    public static *getClientsForUserId(userId: number): Generator<AuthorizedWSClient>
    {
        for(const client of this.getAuthorizedClients())
        {
            if(client.token.getPayloadField('cid') !== userId)
                continue

            yield client
        }
    }

    public static *getClientsForLocationId(locationId: number): Generator<AuthorizedWSClient>
    {
        for(const client of this.getAuthorizedClients())
        {
            if(!client.token.getPayloadField('loc').includes(locationId))
                continue

            yield client
        }
    }

    public static async createClient(socket: WebSocket, request: IncomingMessage): Promise<WSClient>
    {
        let token: TAccess | undefined
        if('authorization' in request.headers && typeof request.headers.authorization === 'string')
        {
            token = Token.fromAuthHeader(request.headers.authorization)

            if(!token.verify())
                throw new TokenInvalidError('Token verification failed')
        }

        const client = new this(socket, request, token)
        this.clients[client.uid] = client
        return client
    }

    private uid:     number
    private socket:  WebSocket
    private request: IncomingMessage
    private token:   T

    private isInitialized = false
    private isDestroyed   = false

    private socketErrorHandler?:   (error: Error) => void
    private socketMessageHandler?: (data: RawData, isBinary: boolean) => void
    private socketCloseHandler?:   (code: number, reason: Buffer) => void

    private constructor(socket: WebSocket, request: IncomingMessage, token: T)
    {
        super()

        this.uid = WSClient.clientUidCounter++
        this.socket   = socket
        this.request  = request
        this.token    = token

        this.initialize()
    }

    public send(data: WSClientMessage): void
    {
        if(!WSClient.isClientAuthorized<TAccess>(this, false))
            return

        this.socket.send(JSON.stringify(data))
    }

    public getRemoteAddress(): string
    {
        return this.request.socket.remoteAddress ?? '?'
    }

    public getUid(): number
    {
        return this.uid
    }

    public destroy(): void
    {
        if(this.isDestroyed)
            return
        this.isDestroyed = true

        if(this.isInitialized)
        {
            this.socket.off('error', this.socketErrorHandler!)
            this.socket.off('message', this.socketMessageHandler!)
            this.socket.off('close', this.socketCloseHandler!)
        }

        delete WSClient.clients[this.uid]
    }

    private initialize(): void
    {
        if(this.isInitialized)
            throw new Error('WSClient can only be initialized once')
        this.isInitialized = true

        this.socket.on('error', this.socketErrorHandler = (error: Error) =>
        {
            this.emit('error', new WSClientError(this, {
                type: 'WEBSOCKET_ERROR',
            }, error, `${error.name} ${error.message}`))
        })

        this.socket.on('message', this.socketMessageHandler = (data: RawData, isBinary: boolean) =>
        {
            if(isBinary)
            {
                this.emit('error', new WSClientError(this, {
                    type: 'MESSAGE_IS_BINARY',
                }, undefined, 'Binary messages is not supported.'))
                return
            }

            try
            {
                const parsed = this.parseIncoming(data)
                if(!parsed) return
    
                if(WSClient.isClientAuthorized<TAccess>(this, false))
                {
                    log.info(`Client#${this.uid} @ ${this.getRemoteAddress()} message:`, parsed)
                    this.emit('message', parsed)
                }
                else if(parsed.type === WSClientMessageTypes.authorize)
                {
                    log.info(`[UNAUTHORIZED] Client#${this.uid} @ ${this.getRemoteAddress()} message:`, parsed)
                    const token = Token.fromAuthHeader(parsed.token)

                    if(!token.verify())
                    {
                        this.emit('error', new WSClientError(this, {
                            type: 'AUTH_FAILED',
                        }, undefined, 'Authorization failed, invalid token'))
                        return
                    }

                    // @ts-expect-error This is allowed, as typescript doesnt use actual generics. They are all fake, an illusion.
                    this.token = token

                    log.info(`Client#${this.uid} authorized using a message`)
                }
            }
            catch(error)
            {
                this.emit('error', new WSClientError(this, {
                    type: 'UNKNOWN',
                }, error, 'OnMessage error'))
            }
        })

        this.socket.on('close', this.socketCloseHandler = (code: number, reason: Buffer) =>
        {
            log.info(`Client closed. Reason(${code}): ${reason}`)
            this.emit('close')
            this.destroy()
        })
    }

    private parseIncoming<M extends WSClientMessage = WSClientMessage>(data: string | RawData): M | undefined
    {
        let parsed
        try
        {
            parsed = JSON.parse(String(data))
        }
        catch(error)
        {
            this.emit('error', new WSClientError(this, {
                type: 'JSON_PARSE_ERROR',
            }, error, 'Messages must be valid JSON'))
        }
        if(!(parsed.type in WSClientMessageTypes))
        {
            this.emit('error', new WSClientError(this, {
                type: 'MESSAGE_TYPE_INVALID',
            }, undefined, 'Message type is missing or invalid.'))
        }
        return parsed as M
    }
}
