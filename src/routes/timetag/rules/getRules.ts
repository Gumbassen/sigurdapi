import { Router, Request, Response } from 'express'
import { error } from '../../../utils/common'
import { fetchTimetagRules } from '../../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/:timeTagId/rules', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const timetagId = Number.parseInt(req.params.timeTagId)

        if(Number.isNaN(timetagId))
            return error(res, 400, 'Invalid URL')

        res.send(Array.from((await fetchTimetagRules(
            token.getPayloadField('cid'),
            'TimeTagId',
            [timetagId],
        )).values()))
    })
}
