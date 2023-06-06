
import { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import { EUserRolePermission } from '../../utils/userpermissions'
import routes from '../../utils/ApiRoutes'

export default endpoint({ nocache: true })
    .SecureGet(EUserRolePermission.everyone, routes.ping.GET).addHandler((req: Request, res: Response) =>
    {
        res.send('pong')
    }).done()
    .export()
