import { Router, Request, Response } from 'express'
import { error, notAllowed, wsbroadcast } from '../../../utils/common'
import { escape, sql, unsafe } from '../../../utils/database'
import log from '../../../utils/Logger'
import permission from '../../../middlewares/permission'
import { EUserRolePermission as URP } from '../../../enums/userpermissions'
import { SQLNoResultError, fetchUser } from '../../../utils/fetchfunctions'

type ApiTimeEntryTypeCollection = ApiDataTypes.Objects.TimeEntryTypeCollection

export default function(router: Router)
{
    router.post('/:userId/tagcollections', permission.oneOf(URP.manage_all_users, URP.manage_location_users), async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const userId    = Number.parseInt(req.params.userId)

        if(Number.isNaN(userId))
            return error(res, 400, 'Invalid URL')

        const requiredProps: (keyof ApiTimeEntryTypeCollection)[] = [
            'TimeEntryTypeId',
            'TimeTagIds',
        ]

        const optionalProps: (keyof ApiTimeEntryTypeCollection)[] = []

        // @ts-expect-error Im using this to build the object
        const collection: ApiTimeEntryTypeCollection = {
            UserId:     userId,
            CompanyId:  companyId,
            TimeTagIds: [],
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
                case 'TimeEntryTypeId':
                    collection.TimeEntryTypeId = Number.parseInt(value)
                    if(Number.isNaN(collection.TimeEntryTypeId) || collection.TimeEntryTypeId < 1)
                        return error(res, 400, `Param "${field}" is invalid.`)
                    break

                case 'TimeTagIds':
                    if(!Array.isArray(value))
                        return error(res, 400, `Param "${field}" must be an array.`)

                    if(!value.length)
                        return error(res, 400, `Param "${field}" cannot be empty.`)

                    for(const id of value.map(id => Number.parseInt(id)))
                    {
                        if(Number.isNaN(id))
                            return error(res, 400, `Param "${field}" contains invalid entries.`)

                        collection.TimeTagIds.push(id)
                    }
                    break
            }
        }

        const permissionChecks = new Map<string, string>()
        if(collection.TimeEntryTypeId)
        {
            permissionChecks.set('TimeEntryTypeId', /*SQL*/`(
                ${escape(collection.TimeEntryTypeId)} IN (
                    SELECT
                        Id
                    FROM
                        time_entry_types
                    WHERE
                        CompanyId = ${escape(collection.CompanyId)}
                        AND Id = ${escape(collection.TimeEntryTypeId)}
                )
                AND ${escape(collection.TimeEntryTypeId)} NOT IN (
                    SELECT
                        TimeEntryTypeId
                    FROM
                        time_entry_type_collections
                    WHERE
                        CompanyId = ${escape(collection.CompanyId)}
                        AND UserId = ${escape(collection.UserId)}
                )
            ) AS TimeEntryTypeId `)
        }

        if(collection.UserId)
        {
            permissionChecks.set('UserId', /*SQL*/`(
                ${escape(collection.UserId)} IN (
                    SELECT
                        Id
                    FROM
                        users
                    WHERE
                        CompanyId = ${escape(collection.CompanyId)}
                )
            ) AS UserId `)
        }

        if(collection.TimeTagIds.length)
        {
            permissionChecks.set('TimeTagIds', /*SQL*/`(
                SELECT
                    COUNT(Id) = 0
                FROM
                    timetags
                WHERE
                    Id IN (${escape(collection.TimeTagIds)})
                    AND CompanyId != ${escape(collection.CompanyId)}
            ) AS TimeTagIds `)
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

        if(!token.hasPermission(URP.manage_all_users))
        {
            const tokenUserLeaderOf = token.getPayloadField('llo')
            try
            {
                const user = await fetchUser(companyId, 'Id', userId)

                // Cannot change users that are not part of the locations you have leadership of
                if(!tokenUserLeaderOf.intersect(user.LocationIds).length)
                    return notAllowed(res)

                // Cannot change users who shares leadership over locations you also have leadership of
                if(tokenUserLeaderOf.intersect(user.LeaderOfIds).length)
                    return notAllowed(res)

                // TODO: Can this use be changed if he is a leader of another location?
            }
            catch(_error)
            {
                if(!(_error instanceof SQLNoResultError))
                    throw _error

                return error(res, 404, 'User not found')
            }
        }

        try
        {
            const result = await sql`
                INSERT INTO
                    time_entry_type_collections
                SET
                    UserId          = ${collection.UserId},
                    CompanyId       = ${collection.CompanyId},
                    TimeEntryTypeId = ${collection.TimeEntryTypeId}`

            collection.Id = result.insertId

            log.silly(`Tag collection was created:\n${JSON.stringify(collection, null, 2)}`)

            if(collection.TimeTagIds.length)
            {
                await sql`
                    INSERT INTO
                        x_time_entry_type_collection_timetags
                        (
                            TimeEntryTypeCollectionId,
                            TimeTagId
                        )
                    VALUES
                        ${unsafe(collection.TimeTagIds.map(id => `(${escape(collection.Id)}, ${escape(id)})`).join(','))}`
            }

            wsbroadcast(res, companyId, 'created', 'TimeEntryTypeCollection', collection)
            res.status(201).send(collection)
        }
        catch(_error)
        {
            log.error(_error)
            error(res, 500, 'Unknown error')
        }
    })
}
