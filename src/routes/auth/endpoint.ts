
import express, { Request, Response } from 'express'
import log from './../../utils/logger'

const router = express.Router()


router.post('/authenticate', (req: Request, res: Response) =>
{
    log.info(req.path)
    // Sad
    res.send('hello from authenticate')
})

router.post('/refresh', (req: Request, res: Response) =>
{
    log.info(req.path)
    // Big sad
    res.send('Hello from refresh')
})




export { router }
