
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import { fetchAllUserRolePermissions } from '../../utils/fetchfunctions'

const router = express.Router()

router.get('/permission', async (req: Request, res: Response) =>
{
    res.send(Array.from((await fetchAllUserRolePermissions()).values()))
})


export default endpoint(router, {})
