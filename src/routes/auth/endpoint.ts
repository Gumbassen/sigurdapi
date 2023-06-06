import { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import Token, {
    RefreshToken,
    AccessToken,
    TokenExpiredError,
    TokenInvalidError,
    TokenMissingError,
} from '../../utils/token'
import intervalparser from '../../utils/intervalparser'
import { error, unauthorized } from '../../utils/common'
import { SQLNoResultError, fetchFullUser, fetchLogin } from '../../utils/fetchfunctions'
import log from '../../utils/logger'
import routes from '../../utils/ApiRoutes'


const ttlAccess  = intervalparser(process.env.TOKEN_TTL_ACCESS  ?? 'P30I').totalSeconds
const ttlRefresh = intervalparser(process.env.TOKEN_TTL_REFRESH ?? 'P1M').totalSeconds

export default endpoint({ nocache: true })
    .InsecurePost(routes.auth.authenticate.POST).addHandler((req: Request, res: Response) =>
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
            return error(res, 400, '"Username" or "Password" is missing or invalid')

        fetchLogin(req.body.Username, req.body.Password).then(async ({ UserId, CompanyId }) =>
        {
            try
            {
                const user = await fetchFullUser(CompanyId, UserId)

                const response: ApiDataTypes.Responses.AuthenticationResponse = {
                    accessToken: Token.fromPayload<AccessToken>({
                        typ: 'access',
                        uid: UserId,
                        cid: CompanyId,
                        rid: user.UserRoleId,
                        fln: user.FullName,
                        hdt: user.HiredDate ?? null,
                        fdt: user.FiredDate ?? null,
                        prm: user.UserRole.PermissionIds,
                    }, ttlAccess).toTokenObject(),
                    refreshToken: Token.fromPayload<RefreshToken>({
                        typ: 'refresh',
                        uid: UserId,
                        cid: CompanyId,
                    }, ttlRefresh).toTokenObject(),
                }

                res.send(response)
            }
            catch(_error)
            {
                if(!(_error instanceof SQLNoResultError))
                    throw _error

                error(res, 400, 'User no longer exists')
            }
        }).catch(_error =>
        {
            if(!(_error instanceof Error))
            {
                log.error(_error)
                error(res, 500, 'Unknown error')
            }

            if(!(_error instanceof SQLNoResultError))
                throw _error

            error(res, 400, 'Invalid credentials')
        })
    }).done()
    .InsecurePost(routes.auth.refresh.POST).addHandler(async (req: Request, res: Response) =>
    {
        try
        {
            const token = Token.fromRequest(req)
            if(!token.verify())
                return unauthorized(res)

            if(!token.isOfType<RefreshToken>('refresh'))
                return unauthorized(res)

            const userId    = token.getPayloadField('uid')
            const companyId = token.getPayloadField('cid')

            const user = await fetchFullUser(companyId, userId)

            const response: ApiDataTypes.Responses.AuthenticationResponse = {
                accessToken: Token.fromPayload<AccessToken>({
                    typ: 'access',
                    uid: token.getPayloadField('uid'),
                    cid: token.getPayloadField('cid'),
                    rid: user.UserRoleId,
                    fln: user.FullName,
                    hdt: user.HiredDate ?? null,
                    fdt: user.FiredDate ?? null,
                    prm: user.UserRole.PermissionIds,
                }).toTokenObject(),
                refreshToken: token.toTokenObject(),
            }

            res.send(response)
        }
        catch(error)
        {
            if([ TokenMissingError, TokenExpiredError, TokenInvalidError ].some(type => error instanceof type))
                return unauthorized(res)

            throw error
        }
    }).done()
    .export()
