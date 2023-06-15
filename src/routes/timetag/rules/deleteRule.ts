import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../../utils/common'
import { fetchTimetagRules } from '../../../utils/fetchfunctions'
import { sql } from '../../../utils/database'
import log from '../../../utils/Logger'

export default function(router: Router)
{
    router.delete('/:timeTagId/rules/:ruleId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const timetagId = Number.parseInt(req.params.timeTagId)
        const ruleId    = Number.parseInt(req.params.ruleId)

        if(Number.isNaN(timetagId) || Number.isNaN(ruleId))
            return error(res, 400, 'Invalid URL')

        const rule = (await fetchTimetagRules(companyId, 'Id', [ruleId])).get(ruleId)

        if(typeof rule === 'undefined')
            return error(res, 404, 'Rule not found')

        const result = await sql`
            DELETE FROM
                timetag_rules
            WHERE
                CompanyId = ${companyId}
                AND TimeTagId = ${timetagId}
                AND Id = ${ruleId}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Failed to delete timetag rule')

        log.silly(`Timetag rule was deleted:\n${JSON.stringify(rule, null, 2)}`)

        wsbroadcast(res, companyId, 'deleted', 'TimeTagRule', { Id: ruleId, TimeTagId: timetagId })
        res.sendStatus(204)
    })
}
