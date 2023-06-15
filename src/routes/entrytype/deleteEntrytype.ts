import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { fetchTimeEntryType } from '../../utils/fetchfunctions'
import { sql } from '../../utils/database'
import { EUserRolePermission as URP } from '../../enums/userpermissions'
import permission from '../../middlewares/permission'

export default function(router: Router)
{
    router.delete('/:typeId', permission.has(URP.manage_all_timetags), async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const typeId    = Number.parseInt(req.params.typeId)

        if(Number.isNaN(typeId))
            return error(res, 400, 'Invalid URL')

        const type = await fetchTimeEntryType(companyId, typeId, false)
        if(!type) return error(res, 404, 'Timeentry type not found')

        const result = await sql`
            DELETE from
                time_entry_types
            WHERE
                CompanyId = ${companyId}
                AND Id = ${typeId}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Failed to delete timeentry type')

        wsbroadcast(res, companyId, 'deleted', 'TimeEntryType', { Id: typeId })
        res.sendStatus(204)
    })
}
