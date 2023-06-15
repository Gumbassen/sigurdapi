import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { fetchLocation } from '../../utils/fetchfunctions'
import { sql } from '../../utils/database'
import permission from '../../middlewares/permission'
import { EUserRolePermission as URP } from '../../enums/userpermissions'

export default function(router: Router)
{
    router.delete('/:locationId', permission.has(URP.manage_all_locations), async (req: Request, res: Response) =>
    {
        const token      = res.locals.accessToken!
        const companyId  = token.getPayloadField('cid')
        const locationId = Number.parseInt(req.params.locationId)

        if(Number.isNaN(locationId))
            return error(res, 400, 'Invalid URL')

        const location = await fetchLocation(companyId, locationId, false)
        if(!location) return error(res, 404, 'Location not found')

        const result = await sql`
            DELETE FROM
                locations
            WHERE
                CompanyId = ${companyId}
                AND Id = ${locationId}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Failed to delete location')

        wsbroadcast(res, companyId, 'deleted', 'Location', { Id: locationId })
        res.sendStatus(204)
    })
}
