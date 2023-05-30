
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'

const router = express.Router()


router.all('/', (req: Request, res: Response) =>
{
    res.send('pong')
})


export default endpoint(router, {})
