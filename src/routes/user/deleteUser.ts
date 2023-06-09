import { Router, Request, Response } from 'express'
import { error } from '../../utils/common'
import { SQLNoResultError, fetchUser } from '../../utils/fetchfunctions'
import { sql } from '../../utils/database'
import log from '../../utils/logger'

export default function(router: Router)
{
    router.delete('/:userId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const userId    = Number.parseInt(req.params.userId)

        if(Number.isNaN(userId))
            return error(res, 400, 'Invalid URL')

        if(userId == token.getPayloadField('uid'))
            return error(res, 400, 'You cannot delete yourself headass')

        try
        {
            const user = await fetchUser(companyId, 'Id', userId)

            const result = await sql`
                DELETE FROM
                    users
                WHERE
                    CompanyId = ${companyId}
                    AND Id = ${user.Id}
                LIMIT 1`

            if(result.affectedRows < 1)
                return error(res, 500, 'Failed to delete user')

            log.silly(`User was deleted:\n${JSON.stringify(user, null, 2)}`)

            res.sendStatus(204)
        }
        catch(_error)
        {
            if(!(_error instanceof SQLNoResultError))
                throw _error

            log.warn(`no user with id=${userId}`)
            error(res, 404, 'User not found')
        }
    })
}
