import { Router, Request, Response } from 'express'
import { error } from '../../../utils/common'
import { fetchLocation, fetchUser } from '../../../utils/fetchfunctions'
import { sql } from '../../../utils/database'

export default function(router: Router)
{
    router.delete('/:locationId/leaders/:leaderId', async (req: Request, res: Response) =>
    {
        const token      = res.locals.accessToken!
        const companyId  = token.getPayloadField('cid')
        const locationId = Number.parseInt(req.params.locationId)
        const leaderId   = Number.parseInt(req.params.leaderId)

        if(Number.isNaN(locationId) || Number.isNaN(leaderId))
            return error(res, 400, 'Invalid URL')

        const location = await fetchLocation(companyId, locationId, false)
        if(!location) return error(res, 404, 'Location not found')

        if(!location.LeaderIds.includes(leaderId))
            return res.sendStatus(204)

        const user = await fetchUser(companyId, 'Id', leaderId, false)
        if(!user) return error(res, 404, 'User not found')

        const result = await sql`
            DELETE FROM
                x_location_leaders
            WHERE
                LocationId = ${locationId}
                AND UserId = ${leaderId}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Failed to delete location leader')

        res.sendStatus(204)
    })
}
