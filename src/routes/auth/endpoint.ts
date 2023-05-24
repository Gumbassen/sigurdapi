
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'

const router = express.Router()


router.post('/authenticate', (req: Request, res: Response) =>
{
    log.info(req.path)
    // Sad
    res.send('hello from authenticate! ' + JSON.stringify(req.body))
})

router.post('/refresh', (req: Request, res: Response) =>
{
    log.info(req.path)
    // Big sad
    res.send('Hello from refresh')
})




export default endpoint(router, {})
