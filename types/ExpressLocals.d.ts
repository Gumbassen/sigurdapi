import { Connection } from 'mysql'

declare global {
    namespace Express {
        export interface Locals {
            db: Connection
        }
    }
}
