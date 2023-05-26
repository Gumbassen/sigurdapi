
import express, { Request, Response } from 'express'
import nocache from 'nocache'
import endpoint from '../../utils/endpoint'
import { sql } from '../../utils/database'
import Token, { TokenExpiredError, TokenInvalidError, TokenMissingError } from '../../utils/token'
import intervalparser from '../../utils/intervalparser'

const router = express.Router()
router.use(nocache())


const ttlAccess  = intervalparser(process.env.TOKEN_TTL_ACCESS  ?? 'P30I').totalSeconds
const ttlRefresh = intervalparser(process.env.TOKEN_TTL_REFRESH ?? 'P1M').totalSeconds


router.post('/authenticate', async (req: Request, res: Response) =>
{
    let validated = 0
    for(const field of [ 'Username', 'Password' ])
    {
        if(!(field in req.body)) continue

        const value = String(req.body[field])

        if(value.length < 3) continue
        if(value.length > 255) continue

        validated++
    }

    if(validated !== 2)
    {
        res.sendStatus(400).end()
        return
    }

    // FIXME: Add hashing to the passwords
    const result = await sql`
        SELECT
            UserId,
            CompanyId
        FROM
            user_logins
        WHERE
            Username = ${String(req.body.Username)}
            AND Password = ${String(req.body.Password)}
        LIMIT 1`

    if(!result.length)
    {
        res.sendStatus(400).end()
        return
    }

    const userId: number    = result[0].UserId
    const companyId: number = result[0].CompanyId
 
    const response: ResponseTypes.AuthenticationResponse = {
        accessToken: Token.fromPayload({
            typ: 'access',
            uid: userId,
            cid: companyId,
        }, ttlAccess).toTokenObject(),
        refreshToken: Token.fromPayload({
            typ: 'refresh',
            uid: userId,
            cid: companyId,
        }, ttlRefresh).toTokenObject(),
    }

    res.send(response)
})

router.post('/refresh', (req: Request, res: Response) =>
{
    try
    {
        const token = Token.fromRequest(req)
        if(!token.verify() || token.getPayloadField('typ') !== 'refresh')
        {
            res.sendStatus(401).end()
            return
        }

        const response: ResponseTypes.AuthenticationResponse = {
            accessToken: Token.fromPayload({
                typ: 'access',
                uid: token.getPayloadField('uid'),
                cid: token.getPayloadField('cid'),
            }).toTokenObject(),
            refreshToken: token.toTokenObject(),
        }

        res.send(response)
    }
    catch(error)
    {
        if([ TokenMissingError, TokenExpiredError, TokenInvalidError ].some(type => error instanceof type))
        {
            res.sendStatus(401).end()
            return
        }

        throw error
    }
})




export default endpoint(router, {})
