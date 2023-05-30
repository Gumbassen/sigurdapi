
import express, { Request, Response } from 'express'
import log from './../../utils/logger'
import { error } from '../../utils/common'
import { fetchTimeEntryMessages } from '../../utils/fetchfunctions'

export default function(router: express.Router)
{
    router.post('/:entryId/messages', (req: Request, res: Response) =>
    {
        log.info(`Stub ${req.method} handler for "${req.baseUrl + req.url}"`)
        res.send('Placeholder handler')
    })
    
    router.get('/:entryId/messages', async (req: Request, res: Response) =>
    {
        const token   = res.locals.accessToken!
        const entryId = Number.parseInt(req.params.entryId)

        if(Number.isNaN(entryId))
            return error(res, 400, 'Invalid URL')

        const messages = await fetchTimeEntryMessages(
            token.getPayloadField('cid'),
            entryId
        )
        
        res.send(Array.from(messages.values()))
    })
}
