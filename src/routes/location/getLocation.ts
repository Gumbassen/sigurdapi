import { Router, Request, Response } from 'express'
import { error } from '../../utils/common'
import { fetchLocation } from '../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/:locationId', async (req: Request, res: Response) =>
    {
        const token      = res.locals.accessToken!
        const companyId  = token.getPayloadField('cid')
        const locationId = Number.parseInt(req.params.locationId)

        if(Number.isNaN(locationId))
            return error(res, 400, 'Invalid URL')

        const location = await fetchLocation(companyId, locationId, false)
        if(!location) return error(res, 404, 'Location not found')
        res.send(location)
    })
}
