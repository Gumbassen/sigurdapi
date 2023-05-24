/* eslint-disable @typescript-eslint/no-non-null-assertion */

// import jwt, { Jwt, JwtPayload, JwtHeader } from "jsonwebtoken"
import { randomUUID } from 'crypto'
import log from './logger'
import { sha256 } from 'js-sha256'

if(typeof process.env.JWT_SECRET !== 'string')
    throw new Error('There is no "process.env.JWT_SECRET"...')

const  SECRET               = sha256(process.env.JWT_SECRET)
export const ALLOW_ALG_NONE = process.env.JWT_ALLOW_ALG_NONE === '1'

log.silly(`Spilled the beans! JWT Secret: ${SECRET}`)


// Custom errors
export class TokenInvalidError extends Error
{
    constructor(message?: string)
    {
        log.info(`Invalid token! ${message}`)
        super(message)
    }
}

export class TokenUnsupportedAlgorithmError extends Error
{
    constructor(algorithm: string)
    {
        super(`Unsupported token algorithm "${algorithm}"!`)
    }
}

// Skeleton interfaces for tokens and their contents
export interface TokenHeader
{
    /** Token type: usually "JWT" or "JWE" */
    typ: 'JWT' | 'JWE'

    /** Signing algorithm */
    alg: 'none' | 'HS256' | 'RS256'

    /** Issuer: string or url */
    iss: string

    /** Expiration time: a unix epoch which if passed the token must no longer be accepted */
    exp: number

    /** Not before time: a unix epoch which if not passed the token must not yet be accepted */
    nbf: number

    /** Issued at: a unix epoch of when the token was issued */
    ist: number

    /** JWT ID: a practically unique ID for this specific token */
    jti: string
}

export interface TokenPayload
{
    /** Subject: string or url. Should be locally or globally unique. */
    sub?: string
}

// The actual token class
export default class Token
{
    public static fromAuthHeader(value?: string): Token
    {
        log.silly(`Generated token from auth-header: ${value}`)

        if(typeof value !== 'string')
            throw new TokenInvalidError('Token value is null')

        if(value!.startsWith('Bearer '))
            value = value!.substring(7)

        const parts = value!.split('.')

        if(parts.length !== 3)
            throw new TokenInvalidError(`parts.length=${parts.length} (should be 3)`)
    
        const [ header, payload, signature ] = parts.map(part => Buffer.from(part, 'base64').toString())
        return new this(header, payload, signature)
    }

    private header: TokenHeader
    private payload: TokenPayload

    private signature?: string = undefined

    constructor(header: string, payload: string, signature?: string)
    {
        this.header    = this.parseHeader(header)
        this.payload   = this.parsePayload(payload)
        this.signature = signature
    }

    public verify(): boolean
    {
        if(typeof this.signature !== 'string')
            return false

        if(this.signature !== this.calculateSignature())
            return false

        return true
    }

    public sign(): void
    {
        this.signature = this.calculateSignature()
    }

    public hasHeader(field: keyof TokenHeader): boolean
    {
        return typeof this.header[field] !== 'undefined'
    }

    public getHeader<T extends keyof TokenHeader>(field: T): TokenHeader[T]
    {
        if(!this.hasHeader(field))
            throw new Error(`Token header does not contain the field "${String(field)}"`)

        return this.header[field]
    }

    public hasPayload(field: keyof TokenPayload): boolean
    {
        return typeof this.payload[field] !== 'undefined'
    }

    public getPayload<T extends keyof TokenPayload>(field: T): TokenPayload[T]
    {
        if(!this.hasPayload(field))
            throw new Error(`Token payload does not contain the field "${String(field)}"`)

        return this.payload[field]
    }

    private calculateSignature(): string
    {
        const algorithm = this.getHeader('alg')
        switch(algorithm)
        {
            case 'none':
                if(!ALLOW_ALG_NONE)
                    throw new TokenUnsupportedAlgorithmError(algorithm)
                return ''

            case 'HS256':
                return this.signature ?? ''

            case 'RS256':
                return this.signature ?? ''

            default:
                throw new TokenUnsupportedAlgorithmError(algorithm)
        }
    }

    private parseHeader(header: string): TokenHeader
    {
        // TODO: Improve this
        return JSON.parse(header)
    }

    private parsePayload(payload: string): TokenPayload
    {
        // TODO: Improve this
        return JSON.parse(payload)
    }
}
