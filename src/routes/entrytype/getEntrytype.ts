import { Router, Request, Response } from 'express'
import { error } from '../../utils/common'
import { fetchTimeEntryType } from '../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/:typeId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const typeId    = Number.parseInt(req.params.typeId)

        if(Number.isNaN(typeId))
            return error(res, 400, 'Invalid URL')

        const type = await fetchTimeEntryType(companyId, typeId, false)
        if(!type) return error(res, 404, 'Timeentry type not found')
        return res.send(type)
    })
}
