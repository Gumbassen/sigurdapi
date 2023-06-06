
import { Request, Response } from 'express'
import log from './../../utils/logger'
import { fetchTimeEntries } from '../../utils/fetchfunctions'
import { error } from '../../utils/common'
import { UnlockedEndpointRouter } from '../../utils/endpoint'
import { EUserRolePermission } from '../../utils/userpermissions'
import routes from '../../utils/ApiRoutes'

export default (router: UnlockedEndpointRouter): UnlockedEndpointRouter => router
    .SecureGet(EUserRolePermission.see_own_entries, routes.entry._entryId_.GET).addHandler(async (req: Request, res: Response) =>
    {
        const token   = res.locals.accessToken!
        const entryId = Number.parseInt(req.params.entryId)

        if(Number.isNaN(entryId))
            return error(res, 400, 'Invalid URL')

        const entries = await fetchTimeEntries(
            token.getPayloadField('cid'),
            [{ field: 'Id', value: [entryId] }]
        )

        if(!entries.has(entryId))
            return error(res, 404, 'Time entry not found')

        res.send(entries.get(entryId)!)
    }).done()
    .SecurePut(EUserRolePermission.create_own_entries, routes.entry._entryId_.PUT).addHandler((req: Request, res: Response) =>
    {
        log.info(`Stub ${req.method} handler for "${req.baseUrl + req.url}"`)
        res.send('Placeholder handler')
    }).done()
    .SecureDelete(EUserRolePermission.create_own_entries, routes.entry._entryId_.DELETE).addHandler((req: Request, res: Response) =>
    {
        log.info(`Stub ${req.method} handler for "${req.baseUrl + req.url}"`)
        res.send('Placeholder handler')
    }).done()
