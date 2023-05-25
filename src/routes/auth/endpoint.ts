
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'
import { sql } from '../../utils/database'

const router = express.Router()

router.post('/authenticate', async (req: Request, res: Response) =>
{
    let validated = 0
    for(const field of [ 'Username', 'Password' ])
    {
        if(!(field in req.body)) continue

        const value = String(req.body[field])

        if(value.length < 3) continue
        if(value.length > 255) continue

        validated++
    }

    if(validated !== 2)
    {
        res.sendStatus(400).end()
        return
    }

    // FIXME: Add hashing to the passwords
    const result = await sql`
        SELECT
            UserId,
            Password
        FROM
            user_logins
        WHERE
            Username = ${String(req.body.Username)}
            AND Password = ${String(req.body.Password)}
        LIMIT 1`

    res.status(200).send('OK').end()
    
})

router.post('/refresh', (req: Request, res: Response) =>
{
    log.info(req.path)
    // Big sad
    res.send('Hello from refresh')
})




export default endpoint(router, {})
