
import express, { Request, Response } from 'express'
import log from './../../utils/logger'
import { fetchTimeEntries } from '../../utils/fetchfunctions'
import { error } from '../../utils/common'

export default function(router: express.Router)
{
    router.get('/:entryId', async (req: Request, res: Response) =>
    {
        const token   = res.locals.accessToken!
        const entryId = Number.parseInt(req.params.entryId)

        if(Number.isNaN(entryId))
            return error(res, 400, 'Invalid URL')

        const entries = await fetchTimeEntries(
            token.getPayloadField('cid'),
            [{ field: 'Id', value: [entryId] }]
        )

        if(!entries.has(entryId))
            return error(res, 404, 'Time entry not found')

        res.send(entries.get(entryId)!)
    })

    router.put('/:entryId', (req: Request, res: Response) =>
    {
        log.info(`Stub ${req.method} handler for "${req.baseUrl + req.url}"`)
        res.send('Placeholder handler')
    })

    router.delete('/:entryId', (req: Request, res: Response) =>
    {
        log.info(`Stub ${req.method} handler for "${req.baseUrl + req.url}"`)
        res.send('Placeholder handler')
    })
}
