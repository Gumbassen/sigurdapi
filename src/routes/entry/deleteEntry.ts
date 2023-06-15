import { Router, Request, Response } from 'express'
import { error, notAllowed, wsbroadcast } from '../../utils/common'
import { fetchTimeEntry } from '../../utils/fetchfunctions'
import { sql } from '../../utils/database'
import log from '../../utils/Logger'
import permission from '../../middlewares/permission'
import { EUserRolePermission as URP } from '../../enums/userpermissions'

export default function(router: Router)
{
    router.delete('/:entryId', permission.oneOf(URP.create_own_entries, URP.manage_location_entries), async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const entryId   = Number.parseInt(req.params.entryId)

        if(Number.isNaN(entryId))
            return error(res, 400, 'Invalid URL')

        const entry = await fetchTimeEntry(companyId, entryId, false)
        if(!entry) return error(res, 404, 'Time entry not found')

        if(!token.isSuperadmin())
        {
            if(!token.hasPermission(URP.manage_location_entries))
            {
                if(entry.UserId !== token.getPayloadField('uid'))
                    return notAllowed(res)
    
                if(token.hasLocation(entry.LocationId))
                    return notAllowed(res)
            }
            else if(!token.isLeaderOf(entry.LocationId))
            {
                return notAllowed(res)
            }
        }

        const result = await sql`
            DELETE FROM
                timeentries
            WHERE
                CompanyId = ${companyId}
                AND Id = ${entry.Id}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Failed to delete time entry')

        log.silly(`Time entry was deleted:\n${JSON.stringify(entry, null, 2)}`)

        wsbroadcast(res, companyId, 'deleted', 'TimeEntry', { Id: entryId })
        res.sendStatus(204)
    })
}
