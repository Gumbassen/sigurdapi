import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { SQLNoResultError, fetchFullTimetag } from '../../utils/fetchfunctions'
import { sql } from '../../utils/database'
import log from '../../utils/Logger'

export default function(router: Router)
{
    router.delete('/:timeTagId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const timetagId = Number.parseInt(req.params.timeTagId)

        if(Number.isNaN(timetagId))
            return error(res, 400, 'Invalid URL')

        try
        {
            const timetag = await fetchFullTimetag(companyId, timetagId)

            const result = await sql`
                DELETE FROM
                    timetags
                WHERE
                    CompanyId = ${companyId}
                    AND Id = ${timetag.Id}
                LIMIT 1`

            if(result.affectedRows < 1)
                return error(res, 500, 'Failed to delete timetag')

            log.silly(`Timetag was deleted:\n${JSON.stringify(timetag, null, 2)}`)

            wsbroadcast(res, companyId, 'deleted', 'TimeTag', { Id: timetagId })
            res.sendStatus(204)
        }
        catch(_error)
        {
            if(!(_error instanceof SQLNoResultError))
                throw _error

            error(res, 404, 'Timetag not found')
        }
    })
}
