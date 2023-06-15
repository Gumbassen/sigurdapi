import express, { Request, Response } from 'express'
import log from '../../../utils/Logger'
import { error, notAllowed, wsbroadcast } from '../../../utils/common'
import { sqlMulti } from '../../../utils/database'
import permission from '../../../middlewares/permission'
import { EUserRolePermission as URP } from '../../../enums/userpermissions'
import { fetchTimeEntry } from '../../../utils/fetchfunctions'

export default function(router: express.Router)
{
    router.post('/:entryId/messages', permission.oneOf(URP.comment_own_entries, URP.manage_location_entries), async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const userId    = token.getPayloadField('uid')
        const entryId   = Number.parseInt(req.params.entryId)

        if(Number.isNaN(entryId))
            return error(res, 400, 'Invalid URL')

        const requiredProps: (keyof ApiDataTypes.Objects.TimeEntryMessage)[] = ['Message']

        const optionalProps: (keyof ApiDataTypes.Objects.TimeEntryMessage)[] = []

        // @ts-expect-error Im using this to build the object
        const messageObj: ApiDataTypes.Objects.TimeEntryMessage = {
            CompanyId:   companyId,
            UserId:      userId,
            TimeEntryId: entryId,
        }

        for(const field of requiredProps.concat(optionalProps))
        {
            if(!(field in req.body) || req.body[field] === null)
            {
                if(optionalProps.includes(field))
                    continue

                return error(res, 400, `Param "${field}" is required.`)
            }

            const value = req.body[field]
            switch(field)
            {
                case 'Message':
                    messageObj[field] = value
                    break
            }
        }

        const entry = await fetchTimeEntry(companyId, entryId, false)
        if(!entry) return error(res, 400, 'URL param "TimeEntryId" is invalid.')

        if(!token.hasPermission(URP.manage_location_entries))
        {
            if(entry.UserId !== token.getPayloadField('uid'))
                return notAllowed(res)
        }
        else
        {
            if(!token.isLeaderOf(entry.LocationId))
                return notAllowed(res)
        }

        try
        {
            const [ , [result = undefined] ] = await sqlMulti/*SQL*/`
                INSERT INTO timeentry_messages SET
                    CompanyId   = ${messageObj.CompanyId},
                    UserId      = ${messageObj.UserId},
                    TimeEntryId = ${messageObj.TimeEntryId},
                    Message     = ${messageObj.Message};
                SELECT
                    Id,
                    UNIX_TIMESTAMP(CreatedAt) AS CreatedAt
                FROM
                    timeentry_messages
                WHERE
                    Id = LAST_INSERT_ID();`

            if(result === undefined)
                throw new Error('Somehow failed to fetch inserted timeentry message')

            messageObj.Id        = result.Id
            messageObj.CreatedAt = result.CreatedAt

            log.silly(`Time entry message was created:\n${JSON.stringify(messageObj, null, 2)}`)

            wsbroadcast(res, companyId, 'created', 'TimeEntryMessage', messageObj)

            res.status(201).send(messageObj)
        }
        catch(_error)
        {
            log.error(_error)
            error(res, 500, 'Unknown error')
        }
    })
}
