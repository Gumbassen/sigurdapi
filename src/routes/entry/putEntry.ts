import { Router, Request, Response } from 'express'
import log from '../../utils/logger'

export default function(router: Router)
{
    router.put('/:entryId', (req: Request, res: Response) =>
    {
        log.info(`Stub ${req.method} handler for "${req.baseUrl + req.url}"`)
        res.send('Placeholder handler')
    })
}
