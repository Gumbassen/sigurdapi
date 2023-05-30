import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import { fetchTimeTagRules, fetchTimetags } from '../../utils/fetchfunctions'
import { error } from '../../utils/common'

const router = express.Router()


router.get('/', async (req: Request, res: Response) =>
{
    const token = res.locals.accessToken!

    res.send(Array.from((await fetchTimetags(
        token.getPayloadField('cid'),
        'CompanyId',
        [token.getPayloadField('cid')],
    )).values()))
})

router.get('/:timeTagId', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const timetagId = Number.parseInt(req.params.timeTagId)

    if(Number.isNaN(timetagId))
        return error(res, 400, 'Invalid URL')

    const timetags = await fetchTimetags(
        token.getPayloadField('cid'),
        'Id',
        [timetagId],
    )

    if(!timetags.has(timetagId))
        return error(res, 404, 'Timetag not found')

    res.send(timetags.get(timetagId))
})

router.get('/:timeTagId/rules', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const timetagId = Number.parseInt(req.params.timeTagId)

    if(Number.isNaN(timetagId))
        return error(res, 400, 'Invalid URL')

    res.send(Array.from((await fetchTimeTagRules(
        token.getPayloadField('cid'),
        'TimeTagId',
        [timetagId],
    )).values()))
})

router.get('/:timeTagId/rules/:ruleId', async (req: Request, res: Response) =>
{
    const token     = res.locals.accessToken!
    const timetagId = Number.parseInt(req.params.timeTagId)
    const ruleId    = Number.parseInt(req.params.ruleId)

    if(Number.isNaN(timetagId) || Number.isNaN(ruleId))
        return error(res, 400, 'Invalid URL')

    const rules = await fetchTimeTagRules(
        token.getPayloadField('cid'),
        'TimeTagId',
        [timetagId],
    )

    if(!rules.has(ruleId))
        return error(res, 404, 'Rule not found')

    res.send(rules.get(ruleId))
})

export default endpoint(router, {})
