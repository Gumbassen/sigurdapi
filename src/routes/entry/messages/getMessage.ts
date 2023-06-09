import express, { Request, Response } from 'express'
import { error } from '../../../utils/common'
import { fetchTimeEntryMessages } from '../../../utils/fetchfunctions'

export default function(router: express.Router)
{
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
