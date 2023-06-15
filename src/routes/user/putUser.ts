import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { SQLNoResultError, fetchUser } from '../../utils/fetchfunctions'
import log from '../../utils/Logger'
import isValidKeyOf from '../../utils/helpers/isvalidkeyof'
import { escape, sql, unsafe } from '../../utils/database'

type ApiUser = ApiDataTypes.Objects.User

export default function(router: Router)
{
    router.put('/:userId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const userId    = Number.parseInt(req.params.userId)
        const companyId = token.getPayloadField('cid')

        const updateableProps: (keyof ApiUser)[] = [
            'UserRoleId',
            'FirstName',
            'MiddleName',
            'SurName',
            'ProfileImage',
            'HiredDate',
            'FiredDate',
            'LocationIds',
        ]

        const nullableProps: (keyof ApiUser)[] = [
            'MiddleName',
            'ProfileImage',
            'HiredDate',
            'FiredDate',
        ]

        // These are the updateable properties if the client is updating the tokens user
        const ownUpdateableProps: (keyof ApiUser)[] = [
            'FirstName',
            'MiddleName',
            'SurName',
            'ProfileImage',
        ]
        const isUpdatingSelf = token.getPayloadField('uid') === userId


        if(Number.isNaN(userId))
            return error(res, 400, 'Invalid URL')


        const user = await fetchUser(companyId, 'Id', userId).catch(_error =>
        {
            if(!(_error instanceof SQLNoResultError))
                throw _error

            log.warn(`No user with id=${userId}`)
            error(res, 404, 'User not found')
        })
        if(typeof user === 'undefined') return


        // Starts out as a copy of the original object
        const updatedUser: NullableifyObject<ApiUser> = Object.assign({}, user, { LocationIds: Array.from(user.LocationIds) })
        for(const field in updatedUser)
        {
            if(!updateableProps.includes(field as keyof ApiUser))
                delete updatedUser[field as keyof ApiUser]
        }

        // Replace any given fields in the "update" object
        for(const field in req.body)
        {
            if(!isValidKeyOf<ApiUser>(field, updateableProps))
                return error(res, 400, `Param "${field}" is not updateable or is otherwise invalid.`)

            if(isUpdatingSelf && !(field in ownUpdateableProps))
                return error(res, 400, `You cannot update "${field}" on yourself.`)

            const value = req.body[field]

            if(value === null)
            {
                if(nullableProps.includes(field))
                {
                    updatedUser[field] = null
                    continue
                }

                return error(res, 400, `Param "${field}" is not nullable. Omit the parameter if you wish not to update it.`)
            }

            switch(field)
            {
                case 'UserRoleId':
                case 'ProfileImage':
                    updatedUser[field] = Number.parseInt(value)
                    if(Number.isNaN(value))
                        return error(res, 400, `Param "${field}" is invalid (must be an integer).`)
                    break

                case 'FirstName':
                case 'MiddleName':
                case 'SurName':
                    updatedUser[field] = value
                    if(!value.length)
                        return error(res, 400, `Param "${field}" is invalid (must be a non-empty string).`)
                    break

                case 'FiredDate':
                case 'HiredDate':
                    updatedUser[field] = Number.parseInt(value)
                    if(Number.isNaN(value))
                        return error(res, 400, `Param "${field}" is invalid (must be an integer / unix timestamp).`)
                    break

                case 'LocationIds':
                    updatedUser.LocationIds = [] // Must be reset if changed
                    if(!Array.isArray(value))
                        return error(res, 400, `Param "${field}" is invalid (must be an array of integers).`)
                    for(const id of value.map(id => Number.parseInt(id)))
                    {
                        if(Number.isNaN(id))
                            return error(res, 400, `Param "${field}" contains invalid entries (must contain only integers).`)

                        if(updatedUser[field]!.includes(id))
                            continue

                        updatedUser[field]!.push(id)
                    }
                    break
            }
        }


        if(updatedUser.HiredDate && updatedUser.FiredDate && updatedUser.FiredDate <= updatedUser.HiredDate)
            return error(res, 400, 'Param "FiredDate" cannot be on or after "HiredDate".')


        const permissionChecks = new Map<string, string>()
        if(updatedUser.LocationIds!.length)
        {
            permissionChecks.set('LocationIds', /*SQL*/`(
                SELECT
                    COUNT(Id) = ${escape(updatedUser.LocationIds!.length)}
                FROM
                    locations
                WHERE
                    Id IN (${escape(updatedUser.LocationIds)})
                    AND CompanyId = ${escape(companyId)}
            ) AS LocationIds `)
        }

        if(updatedUser.UserRoleId)
        {
            permissionChecks.set('UserRoleId', /*SQL*/`(
                ${escape(updatedUser.UserRoleId)} IN (
                    SELECT
                        Id
                    FROM
                        user_roles
                    WHERE
                        CompanyId = ${escape(companyId)}
                        AND Id = ${escape(updatedUser.UserRoleId)}
                )
            ) AS UserRoleId `)
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

        updatedUser.FullName = [ updatedUser.FirstName, ...updatedUser.MiddleName ? [updatedUser.MiddleName] : [], updatedUser.SurName ].join(' ')

        const updateSet: string[]         = []
        const locationsToAdd: number[]    = []
        const locationsToRemove: number[] = []
        for(const field of updateableProps.concat(Object.keys(updatedUser) as (keyof ApiUser)[]).unique())
        {
            if(user[field] == null && updatedUser[field] == null)
            {
                log.info(`Skipped ${field} (null)`)
                continue
            }

            if(user[field] === updatedUser[field])
            {
                log.info(`Skipped ${field} (exact match)`)
                continue
            }

            switch(field)
            {
                case 'UserRoleId': // Strings and integers
                case 'FirstName':
                case 'MiddleName':
                case 'SurName':
                case 'FullName':
                case 'ProfileImage':
                case 'HiredDate':
                case 'FiredDate':
                    if(updatedUser[field] == null)
                    {
                        if(!nullableProps.includes(field))
                            return error(res, 500, `(unreachable?) The field "${field}" cannot be set to null.`)

                        updateSet.push(/*SQL*/`u.${field} = NULL`)
                    }
                    else
                    {
                        updateSet.push(/*SQL*/`u.${field} = ${escape(updatedUser[field])}`)
                    }
                    break

                case 'LocationIds':
                    locationsToAdd.push(...updatedUser.LocationIds!.filter(id => !user.LocationIds.includes(id)))
                    locationsToRemove.push(...user.LocationIds.filter(id => !updatedUser.LocationIds!.includes(id)))
                    break
            }
        }


        const queries = []
        if(updateSet.length)
        {
            queries.push(sql`
                UPDATE
                    users AS u
                SET
                    ${unsafe(updateSet.join(','))}
                WHERE
                    u.Id = ${userId}
                    AND u.CompanyId = ${companyId}
                LIMIT 1
            `)
        }

        if(locationsToAdd.length)
        {
            queries.push(sql`
                INSERT INTO
                    x_user_locations
                    ( UserId, LocationId )
                VALUES
                    ${unsafe(locationsToAdd.map(id => /*SQL*/`(${escape(userId)},${escape(id)})`).join(','))}
            `)
        }

        if(locationsToRemove.length)
        {
            queries.push(sql`
                DELETE FROM
                    x_user_locations
                WHERE
                    UserId = ${userId}
                    AND LocationId IN (${locationsToRemove})
                LIMIT ${locationsToRemove.length}
            `)
        }

        if(!queries.length) // No changes then
            return res.send(user)

        await Promise.all(queries).catch(_error =>
        {
            log.error(_error)
            return Promise.reject(_error)
        })

        const fetched = await fetchUser(companyId, 'Id', userId)
        wsbroadcast(res, companyId, 'updated', 'User', fetched)
        res.send(fetched)
    })
}
