/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Request } from 'express'
import { createHmac, randomUUID } from 'crypto'
import log from './logger'

if(typeof process.env.JWT_SECRET !== 'string')
    throw new Error('There is no "process.env.JWT_SECRET"...')

const        SECRET         = process.env.JWT_SECRET
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

export class TokenMissingError extends Error
{
    constructor(message?: string)
    {
        log.info('Token is missing!')
        super(message)
    }
}

export class TokenExpiredError extends Error
{
    constructor(message?: string)
    {
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

    /** Issued at: a unix epoch of when the token was issued */
    ist: number

    /** JWT ID: a practically unique ID for this specific token */
    jti: string
}

interface BaseTokenType {
    /** Token type: Determines whether this is an access or refresh token */
    typ: string

    /** User ID: The current users ID */
    uid: number

    /** Company ID: The current users company ID */
    cid: number
}

export interface AccessToken extends BaseTokenType {
    typ: 'access'

    /** UserRole ID: The current users UserRole ID */
    rid: number

    /** FullName: The users full name */
    fln: string

    /** HiredDate: The users first day of employment (if set) */
    hdt: Nullable<number>

    /** FiredDate: The users last day of employment (if set) */
    fdt: Nullable<number>
}

export interface RefreshToken extends BaseTokenType {
    typ: 'refresh'
}

export type TokenType = AccessToken | RefreshToken

// The actual token class
export default class Token<T extends BaseTokenType = TokenType>
{
    public static fromAuthHeader<T extends BaseTokenType = TokenType>(value: string): Token<T>
    {
        if(value.startsWith('Bearer '))
            value = value.substring(7)

        const parts = value.split('.')

        if(parts.length !== 3)
            throw new TokenInvalidError(`parts.length=${parts.length} (should be 3)`)
    
        const token = new this<T>()
        token.header    = this.parseHeader(parts[0])
        token.payload   = this.parsePayload<T>(parts[1])
        token.signature = parts[2]
        return token
    }

    public static fromRequest<T extends BaseTokenType = TokenType>(request: Request): Token<T>
    {
        const value = request.header('Authorization')
        if(typeof value !== 'string')
            throw new TokenMissingError()

        return this.fromAuthHeader<T>(value)
    }

    public static fromPayload<T extends BaseTokenType = TokenType>(payload: T, ttl?: number): Token<T>
    {
        const now = Date.now()

        if(typeof ttl === 'undefined')
            ttl = 30 * 60 * 1000 // Default 30 minutes

        const token = new this<T>()
        token.header = {
            typ: 'JWT',
            alg: 'HS256',
            exp: now + ttl,
            ist: now,
            iss: 'Bongotrummer',
            jti: randomUUID(),
        }
        token.payload = payload
        token.sign()
        return token
    }

    private header!: TokenHeader
    private payload!: T

    private verified = false
    private signature?: string = undefined

    private constructor()
    {
        // Empty
    }

    public verify(): boolean
    {
        if(this.hasHeaderField('typ') && this.getHeaderField('typ') !== 'JWT')
            return false

        if(typeof this.signature !== 'string')
            return false

        if(this.verified)
            return true

        if(this.signature !== this.calculateSignature())
            return false

        this.verified = true
        return true
    }

    public sign(): void
    {
        if(this.verified)
            return

        this.verified  = true
        this.signature = this.calculateSignature()
    }

    public unsign(): void
    {
        this.verified  = false
        this.signature = undefined
    }

    public hasSignature(): boolean
    {
        return typeof this.signature !== 'undefined'
    }

    /**
     * Checks if the token header contains a given field.
     */
    public hasHeaderField(field: keyof TokenHeader): boolean
    {
        return typeof this.header[field] !== 'undefined'
    }

    /**
     * Gets the value of a specific header field.
     */
    public getHeaderField<K extends keyof TokenHeader>(field: K): TokenHeader[K]
    {
        if(!this.hasHeaderField(field))
            throw new Error(`Token header does not contain the field "${String(field)}"`)

        return this.header[field]
    }

    /**
     * Sets the value of a specific header field.
     * 
     * Resets the token signature.
     */
    public setHeaderField<K extends keyof TokenHeader>(field: K, value: TokenHeader[K]): void
    {
        this.header[field] = value
        this.unsign()
    }

    /**
     * Checks if the token payload contains a given field.
     */
    public hasPayloadField(field: keyof T): boolean
    {
        return typeof this.payload[field] !== 'undefined'
    }

    /**
     * Gets the value of a specific payload field.
     */
    public getPayloadField<K extends keyof T>(field: K): T[K]
    {
        if(!this.hasPayloadField(field))
            throw new Error(`Token payload does not contain the field "${String(field)}"`)

        return this.payload[field]
    }

    /**
     * Sets the value of a specific payload field.
     * 
     * Resets the token signature.
     */
    public setPayloadField<K extends keyof T>(field: K, value: T[K]): void
    {
        this.payload[field] = value
        this.unsign()
    }

    public toTokenString(): string
    {
        return `${this.getEncodedHeader()}.${this.getEncodedPayload()}.${this.calculateSignature()}`
    }

    public toTokenObject(): ApiDataTypes.Objects.TokenObject
    {
        return {
            token:     this.toTokenString(),
            expiresAt: this.getHeaderField('exp'),
            issuedAt:  this.getHeaderField('ist'),
        }
    }

    private calculateSignature(): string
    {
        if(!this.hasHeaderField('alg'))
            throw new TokenInvalidError('Missing "alg" field.')
        
        const algorithm = this.getHeaderField('alg')
        switch(algorithm)
        {
            case 'none':
                if(!ALLOW_ALG_NONE)
                    throw new TokenUnsupportedAlgorithmError(algorithm)
                return ''

            case 'HS256':
                return createHmac('sha256', SECRET)
                    .update(`${this.getEncodedHeader()}.${this.getEncodedPayload()}`)
                    .digest('base64url')

            default:
                throw new TokenUnsupportedAlgorithmError(algorithm)
        }
    }

    private getEncodedHeader(): string
    {
        return Buffer.from(JSON.stringify(this.header)).toString('base64url')
    }

    private getEncodedPayload(): string
    {
        return Buffer.from(JSON.stringify(this.payload)).toString('base64url')
    }

    private static parseHeader(header: string): TokenHeader
    {
        // TODO: Improve this
        return JSON.parse(Buffer.from(header, 'base64url').toString())
    }

    private static parsePayload<T extends BaseTokenType = TokenType>(payload: string): T
    {
        // TODO: Improve this
        return JSON.parse(Buffer.from(payload, 'base64url').toString())
    }

    public isOfType<C extends TokenType>(type: C['typ']): this is Token<C>
    {
        return this.getPayloadField('typ') === type
    }
}
