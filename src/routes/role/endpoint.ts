
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import { SQLNoResultError, fetchFullUserRole, fetchUserRoles } from '../../utils/fetchfunctions'
import { error } from '../../utils/common'

const router = express.Router()

router.get('/', async (req: Request, res: Response) =>
{
    const token = res.locals.accessToken!

    res.send(Array.from((await fetchUserRoles(
        token.getPayloadField('cid'),
        'CompanyId',
        [token.getPayloadField('cid')],
    )).values()))
})

router.get('/:roleId', async (req: Request, res: Response) =>
{
    const token  = res.locals.accessToken!
    const roleId = Number.parseInt(req.params.roleId)

    if(Number.isNaN(roleId))
        return error(res, 400, 'Invalid URL')

    try
    {
        res.send(await fetchFullUserRole(
            token.getPayloadField('cid'),
            roleId,
        ))
    }
    catch(_error)
    {
        if(!(_error instanceof SQLNoResultError))
            throw _error

        error(res, 404, 'UserRole not found')
    }
})


export default endpoint(router, {})
