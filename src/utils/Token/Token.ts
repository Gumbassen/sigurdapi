/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Request } from 'express'
import { createHash, createHmac, randomUUID } from 'crypto'
import log from '../Logger'
import fs from 'fs'
import { TokenInvalidError, TokenMissingError, TokenUnsupportedAlgorithmError } from './TokenErrors'
import { TokenSegments } from './TokenSegments'

if(typeof process.env.JWT_SECRET !== 'string')
    throw new Error('There is no "process.env.JWT_SECRET"...')

const        SECRET         = process.env.JWT_SECRET
export const ALLOW_ALG_NONE = process.env.JWT_ALLOW_ALG_NONE === '1'


// Contains this files md5 hash, which is used to version-control the tokens.
// If this file has been changed, then the token will probably be invalid
let selfHashString: string
export function getTokenVersionId(): string
{
    if(selfHashString)
        return selfHashString

    selfHashString = ''
    const bytes = createHash('sha1').update(fs.readFileSync(__filename)).digest('binary')
    for(let i = 0; i < bytes.length / 4; i++)
    {
        let n = 0
        for(let j = 0; j < 4; j++)
            n += bytes.charCodeAt(i * 4 + j)

        selfHashString += (n % 256).toString(16).padStart(2, '0')
    }
    log.silly(`Token version ID: ${selfHashString}`)
    return selfHashString
}

// The actual token class
export default class Token<T extends TokenType = TokenType.Any>
{
    public static fromAuthHeader<T extends TokenType = TokenType.Any>(value: string): Token<T>
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

    public static fromRequest<T extends TokenType = TokenType.Any>(request: Request): Token<T>
    {
        const value = request.header('Authorization')
        if(typeof value !== 'string')
            throw new TokenMissingError()

        return this.fromAuthHeader<T>(value)
    }

    public static fromPayload<T extends TokenType = TokenType.Any>(payload: T, ttl?: number): Token<T>
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
            ver: getTokenVersionId(),
        }
        token.payload = payload
        token.sign()
        return token
    }

    private header!:  TokenSegments.Header
    private payload!: T

    private verified = false
    private signature?: string = undefined

    private constructor()
    {
        // Empty
    }

    public verify(): boolean
    {
        if(!this.hasHeaderField('typ') || this.getHeaderField('typ') !== 'JWT')
        {
            log.silly('Token rejected: Invalid or missing token type.')
            return false
        }

        if(!this.hasHeaderField('ver') || this.getHeaderField('ver') !== getTokenVersionId())
        {
            log.silly(`Token rejected: Token version mismatch. [ours: ${getTokenVersionId()}] vs [theirs: ${this.getHeaderFieldOrUndefined('ver')}]`)
            return false
        }

        if(typeof this.signature !== 'string')
        {
            log.silly('Token rejected: Token signature is missing or invalid.')
            return false
        }

        if(this.verified)
            return true

        if(this.signature !== this.calculateSignature())
        {
            log.silly('Token rejected: Token signature mismatch.')
            return false
        }

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
    public hasHeaderField(field: keyof TokenSegments.Header): boolean
    {
        return typeof this.header[field] !== 'undefined'
    }

    /**
     * Gets the value of a specific header field.
     */
    public getHeaderField<K extends keyof TokenSegments.Header>(field: K): TokenSegments.Header[K]
    {
        if(!this.hasHeaderField(field))
            throw new Error(`Token header does not contain the field "${String(field)}"`)

        return this.header[field]
    }

    public getHeaderFieldOrUndefined<K extends keyof TokenSegments.Header>(field: K): TokenSegments.Header[K] | undefined
    {
        if(!this.hasHeaderField(field))
            return undefined

        return this.getHeaderField(field)
    }

    /**
     * Sets the value of a specific header field.
     * 
     * Resets the token signature.
     */
    public setHeaderField<K extends keyof TokenSegments.Header>(field: K, value: TokenSegments.Header[K]): void
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

    private static parseHeader(header: string): TokenSegments.Header
    {
        // TODO: Improve this
        return JSON.parse(Buffer.from(header, 'base64url').toString())
    }

    private static parsePayload<T extends TokenType = TokenType.Any>(payload: string): T
    {
        // TODO: Improve this
        return JSON.parse(Buffer.from(payload, 'base64url').toString())
    }

    public isOfType<C extends TokenType>(type: C['typ']): this is Token<C>
    {
        return this.getPayloadField('typ') === type
    }
}
