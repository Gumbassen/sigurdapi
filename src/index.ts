

// Environment setup
import express, { Express, Request, Response } from 'express'
import dotenv from 'dotenv'
dotenv.config()

import logger from './logger'

const app: Express = express()
const port         = process.env.PORT



app.get('/', (req: Request, res: Response) =>
{
    logger.http('Hello world was visited.')
    res.send('Hello World!')
})

app.listen(port, () =>
{
    logger.info(`⚡ [SERVER] Listening on port ${port}`)
})
