import Token, { AccessToken, RefreshToken } from '../src/utils/token'

declare global {
    namespace Express {
        export interface Locals {
            accessToken?: Token<AccessToken>
            refreshToken?: Token<RefreshToken>
        }
    }
}
