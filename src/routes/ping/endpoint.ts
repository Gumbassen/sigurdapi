
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'

const router = express.Router()


router.all('/', (req: Request, res: Response) =>
{
    res.send('pong')
})


export default endpoint(router, {})
