import { Router, Request, Response } from 'express'
import { error } from '../../../utils/common'
import { fetchLocationUsers } from '../../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/:locationId/users', async (req: Request, res: Response) =>
    {
        const token      = res.locals.accessToken!
        const locationId = Number.parseInt(req.params.locationId)

        if(Number.isNaN(locationId))
            return error(res, 400, 'Invalid URL')

        const usersByLocation = await fetchLocationUsers(
            token.getPayloadField('cid'),
            [locationId],
        )

        if(!usersByLocation.has(locationId))
            return error(res, 404, 'Location not found')

        res.send(usersByLocation.get(locationId))
    })
}
