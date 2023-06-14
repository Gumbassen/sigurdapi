
export enum WSClientMessageTypes {
    ping      = 'ping',
    pong      = 'pong',
    action    = 'action',
    authorize = 'authorize',
}

export interface WSClientBaseMessage {
    type: WSClientMessageTypes
}

export interface WSClientPingMessage extends WSClientBaseMessage {
    type:      WSClientMessageTypes.ping
    challenge: string
}

export interface WSClientPongMessage extends WSClientBaseMessage {
    type:   WSClientMessageTypes.pong
    answer: string
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
     * If the action is "deleted", then this will only contain a single "Id"-property.
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
    | WSClientPongMessage
    | WSClientActionMessage
    | WSClientAuthorizeMessage
