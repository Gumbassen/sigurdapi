import Token from '../src/utils/Token/Token'
import { WebSocketServer } from 'ws'
import { WSClientActionMessage } from '../src/wsserver/WSClient'

declare global {
    namespace Express {
        export interface Locals {
            accessToken?:  Token<TokenType.Access>
            refreshToken?: Token<TokenType.Refresh>
            wss:           WebSocketServer
            wsbroadcast:   (message: WSClientActionMessage) => void
        }
    }
}
