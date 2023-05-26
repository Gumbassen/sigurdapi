
import express, { Request, Response } from 'express'
import log from './../../utils/logger'

export default function(router: express.Router)
{
    router.get('/:entryId', (req: Request, res: Response) =>
    {
        log.info(`Stub ${req.method} handler for "${req.baseUrl + req.url}"`)
        res.send('Placeholder handler')
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
