import log from '../Logger'

export abstract class TokenError extends Error
{
    constructor(message?: string)
    {
        super(message)
    }
}

export class TokenInvalidError extends TokenError
{
    constructor(message?: string)
    {
        log.info(`Invalid token! ${message}`)
        super(message)
    }
}

export class TokenMissingError extends TokenError
{
    constructor(message?: string)
    {
        log.info('Token is missing!')
        super(message)
    }
}

export class TokenExpiredError extends TokenError
{
    constructor(message?: string)
    {
        super(message)
    }
}

export class TokenUnsupportedAlgorithmError extends TokenError
{
    constructor(algorithm: string)
    {
        super(`Unsupported token algorithm "${algorithm}"!`)
    }
}
