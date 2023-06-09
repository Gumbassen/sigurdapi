
import { Router, Request, Response } from 'express'

export default function(router: Router)
{
    router.all('/', (req: Request, res: Response) =>
    {
        res.send('pong')
    })
}
