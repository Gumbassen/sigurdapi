import Token, { AccessToken, RefreshToken } from '../src/utils/token'
import { WebSocketServer } from 'ws'
import { WSClientActionMessage } from '../src/wsserver/WSClient'

declare global {
    namespace Express {
        export interface Locals {
            accessToken?:  Token<AccessToken>
            refreshToken?: Token<RefreshToken>
            wss:           WebSocketServer
            wsbroadcast:   (message: WSClientActionMessage) => void
        }
    }
}
