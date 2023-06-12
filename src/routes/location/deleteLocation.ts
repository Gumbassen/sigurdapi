import { Router, Request, Response } from 'express'
import { error } from '../../utils/common'
import { SQLNoResultError, fetchLocation } from '../../utils/fetchfunctions'
import { sql } from '../../utils/database'

export default function(router: Router)
{
    router.delete('/:locationId', async (req: Request, res: Response) =>
    {
        const token      = res.locals.accessToken!
        const companyId  = token.getPayloadField('cid')
        const locationId = Number.parseInt(req.params.locationId)

        if(Number.isNaN(locationId))
            return error(res, 400, 'Invalid URL')

        const location = await fetchLocation(companyId, locationId).catch(_error =>
        {
            if(!(_error instanceof SQLNoResultError))
                throw _error

            return error(res, 404, 'Location not found')
        })
        if(!location) return

        const result = await sql`
            DELETE FROM
                locations
            WHERE
                CompanyId = ${companyId}
                AND Id = ${locationId}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Failed to delete location')

        res.sendStatus(204)
    })
}
