import { Connection } from 'mysql'
import Token from '../src/utils/token'

declare global {
    namespace Express {
        export interface Locals {
            db: Connection
            accessToken?: Token
            refreshToken?: Token
        }
    }
}
