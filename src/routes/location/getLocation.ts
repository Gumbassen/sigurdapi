import { Router, Request, Response } from 'express'
import { error } from '../../utils/common'
import { fetchLocations } from '../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/:locationId', async (req: Request, res: Response) =>
    {
        const token      = res.locals.accessToken!
        const locationId = Number.parseInt(req.params.locationId)

        if(Number.isNaN(locationId))
            return error(res, 400, 'Invalid URL')

        const locations = await fetchLocations(
            token.getPayloadField('cid'),
            'Id',
            [locationId],
        )

        if(!locations.has(locationId))
            return error(res, 404, 'Location not found')

        res.send(locations.get(locationId))
    })
}
