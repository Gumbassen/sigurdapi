import { Router, Request, Response } from 'express'
import { error } from '../../utils/common'
import { fetchTimetags } from '../../utils/fetchfunctions'

export default function(router: Router)
{
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
}
