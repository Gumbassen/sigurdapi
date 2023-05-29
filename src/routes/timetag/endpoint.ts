
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'
import { fetchTimeTagRules, fetchTimetags } from '../../utils/fetchfunctions'

const router = express.Router()


router.get('/', async (req: Request, res: Response) =>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token = res.locals.accessToken!

    res.send(Array.from((await fetchTimetags(
        token.getPayloadField('cid'),
        'CompanyId',
        [token.getPayloadField('cid')],
    )).values()))
})

router.get('/:timeTagId', async (req: Request, res: Response) =>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token     = res.locals.accessToken!
    const timetagId = Number.parseInt(req.params.timeTagId)

    if(Number.isNaN(timetagId))
    {
        res.status(400).send('Invalid URL')
        return
    }

    const timetags = await fetchTimetags(
        token.getPayloadField('cid'),
        'Id',
        [timetagId],
    )

    if(!timetags.has(timetagId))
    {
        res.sendStatus(404)
        return
    }

    res.send(timetags.get(timetagId))
})

router.get('/:timeTagId/rules', async (req: Request, res: Response) =>
{
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token     = res.locals.accessToken!
    const timetagId = Number.parseInt(req.params.timeTagId)

    if(Number.isNaN(timetagId))
    {
        res.status(400).send('Invalid URL')
        return
    }

    res.send(Array.from((await fetchTimeTagRules(
        token.getPayloadField('cid'),
        'TimeTagId',
        [timetagId],
    )).values()))
})


export default endpoint(router, {})
