import { Router, Request, Response } from 'express'
import { error } from '../../../utils/common'
import { fetchTimetagRules } from '../../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/:timeTagId/rules/:ruleId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const timetagId = Number.parseInt(req.params.timeTagId)
        const ruleId    = Number.parseInt(req.params.ruleId)

        if(Number.isNaN(timetagId) || Number.isNaN(ruleId))
            return error(res, 400, 'Invalid URL')

        const rules = await fetchTimetagRules(companyId, 'TimeTagId', [timetagId])

        if(!rules.has(ruleId))
            return error(res, 404, 'Rule not found')

        res.send(rules.get(ruleId))
    })
}
