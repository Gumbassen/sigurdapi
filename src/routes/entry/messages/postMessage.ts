import express, { Request, Response } from 'express'
import log from '../../../utils/logger'
import { error } from '../../../utils/common'
import { escape, sql, sqlMulti, unsafe } from '../../../utils/database'

export default function(router: express.Router)
{
    router.post('/:entryId/messages', async (req: Request, res: Response) =>
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

        const permissionChecks = new Map<string, string>()
        if(messageObj.TimeEntryId)
        {
            permissionChecks.set('TimeEntryId', /*SQL*/`(
                ${escape(messageObj.TimeEntryId)} IN (
                    SELECT
                        Id
                    FROM
                        timeentries
                    WHERE
                        CompanyId = ${escape(messageObj.CompanyId)}
                        AND Id    = ${escape(messageObj.TimeEntryId)})
                ) AS TimeEntryId `
            )
        }

        if(permissionChecks.size)
        {
            const result = await sql`SELECT ${unsafe(Array.from(permissionChecks.values()).join(','))}`

            for(const prop of permissionChecks.keys())
            {
                if(result[0][prop] !== 1)
                    return error(res, 400, `Param "${prop}" is invalid.`)
            }
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

            res.status(201).send(messageObj)
        }
        catch(_error)
        {
            log.error(_error)
            error(res, 500, 'Unknown error')
        }
    })
}
