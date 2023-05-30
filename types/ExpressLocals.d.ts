import { Connection } from 'mysql'
import Token from '../src/utils/token'

declare global {
    namespace Express {
        export interface Locals {
            accessToken?: Token
            refreshToken?: Token
        }
    }
}
