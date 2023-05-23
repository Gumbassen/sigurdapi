
import express, { Request, Response } from 'express'
import log from './../../utils/logger'

const router = express.Router()


router.get('/', (req: Request, res: Response) =>
{
    log.info(`Stub GET handler for "${req.path}"`)

    res.send('Placeholder handler')
})


export { router }
