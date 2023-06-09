import { Router, Request, Response } from 'express'
import { error } from '../../utils/common'
import { fetchTimeEntries } from '../../utils/fetchfunctions'
import { sql } from '../../utils/database'
import log from '../../utils/logger'

export default function(router: Router)
{
    router.delete('/:entryId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const entryId   = Number.parseInt(req.params.entryId)

        if(Number.isNaN(entryId))
            return error(res, 400, 'Invalid URL')

        const entry = (await fetchTimeEntries(companyId, [{ field: 'Id', value: [entryId] }])).get(entryId)

        if(typeof entry === 'undefined')
            return error(res, 404, 'Time entry not found')

        const result = await sql`
            DELETE FROM
                timeentries
            WHERE
                CompanyId = ${companyId}
                AND Id = ${entry.Id}
            LIMIT 1`

        if(result.affectedRows < 1)
            return error(res, 500, 'Failed to delete time entry')

        log.silly(`Time entry was deleted:\n${JSON.stringify(entry, null, 2)}`)

        res.sendStatus(204)
    })
}
