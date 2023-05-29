
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'
import { fetchLocationUsers, fetchLocations, fetchUsers } from '../../utils/fetchfunctions'

const router = express.Router()


router.get('/', async (req: Request, res: Response) =>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token = res.locals.accessToken!

    res.send(Array.from((await fetchLocations(
        token.getPayloadField('cid'),
        'CompanyId',
        [token.getPayloadField('cid')],
    )).values()))
})

router.get('/:locationId', async (req: Request, res: Response) =>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token      = res.locals.accessToken!
    const locationId = Number.parseInt(req.params.locationId)

    if(Number.isNaN(locationId))
    {
        res.status(400).send('Invalid URL')
        return
    }

    const locations = await fetchLocations(
        token.getPayloadField('cid'),
        'Id',
        [locationId],
    )

    if(!locations.has(locationId))
    {
        res.sendStatus(404)
        return
    }

    res.send(locations.get(locationId))
})

router.get('/:locationId/users', async (req: Request, res: Response) =>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token      = res.locals.accessToken!
    const locationId = Number.parseInt(req.params.locationId)

    if(Number.isNaN(locationId))
    {
        res.status(400).send('Invalid URL')
        return
    }

    const usersByLocation = await fetchLocationUsers(
        token.getPayloadField('cid'),
        [locationId],
    )

    if(!usersByLocation.has(locationId))
    {
        res.sendStatus(404)
        return
    }

    res.send(usersByLocation.get(locationId))
})

router.get('/:locationId/leaders', async (req: Request, res: Response) =>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token      = res.locals.accessToken!
    const locationId = Number.parseInt(req.params.locationId)

    if(Number.isNaN(locationId))
    {
        res.status(400).send('Invalid URL')
        return
    }

    const locations = await fetchLocations(
        token.getPayloadField('cid'),
        'Id',
        [locationId],
    )

    if(!locations.has(locationId))
    {
        res.sendStatus(404)
        return
    }

    res.send(Array.from((await fetchUsers(
        token.getPayloadField('cid'),
        'Id',
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        locations.get(locationId)!.LeaderIds,
    )).values()))
})

export default endpoint(router, {})
