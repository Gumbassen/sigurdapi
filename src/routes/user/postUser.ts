import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { escape, nullableEpoch, sql, unsafe } from '../../utils/database'
import log from '../../utils/Logger'

type ApiUser = ApiDataTypes.Objects.User

export default function(router: Router)
{
    router.post('/', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')

        const requiredProps: (keyof ApiUser)[] = [
            'UserRoleId',
            'FirstName',
            'SurName',
        ]

        const optionalProps: (keyof ApiUser)[] = [
            'MiddleName',
            'ProfileImage',
            'HiredDate',
            'FiredDate',
            'LocationIds',
        ]

        // @ts-expect-error Im using this to build the object
        const userObj: ApiUser = {
            CompanyId:            companyId,
            TimeTagCollectionIds: [],
            LocationIds:          [],
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
                case 'UserRoleId':
                case 'ProfileImage':
                    userObj[field] = Number.parseInt(value)
                    if(Number.isNaN(value))
                        return error(res, 400, `Param "${field}" is invalid.`)
                    break

                case 'FirstName':
                case 'MiddleName':
                case 'SurName':
                    userObj[field] = value
                    if(!value.length)
                        return error(res, 400, `Param "${field}" cannot be empty.`)
                    break

                case 'FiredDate':
                case 'HiredDate':
                    userObj[field] = Number.parseInt(value)
                    if(Number.isNaN(value))
                        return error(res, 400, `Param "${field}" is invalid.`)
                    break

                case 'LocationIds':
                    if(!Array.isArray(value))
                        return error(res, 400, `Param "${field}" must be an array of integers.`)
                    for(const id of value.map(id => Number.parseInt(id)))
                    {
                        if(Number.isNaN(id))
                            return error(res, 400, `Param "${field}" contains invalid entries.`)

                        if(userObj[field].includes(id))
                            continue

                        userObj[field].push(id)
                    }
                    break
            }
        }


        if(userObj.HiredDate && userObj.FiredDate && userObj.FiredDate <= userObj.HiredDate)
            return error(res, 400, 'Param "FiredDate" cannot be on or after "HiredDate".')


        const permissionChecks = new Map<string, string>()
        if(userObj.LocationIds.length)
        {
            permissionChecks.set('LocationIds', /*SQL*/`(
                SELECT
                    COUNT(Id) = ${escape(userObj.LocationIds.length)}
                FROM
                    locations
                WHERE
                    Id IN (${escape(userObj.LocationIds)})
                    AND CompanyId = ${escape(userObj.CompanyId)}
            ) AS LocationIds `)
        }

        if(userObj.UserRoleId)
        {
            permissionChecks.set('UserRoleId', /*SQL*/`(
                ${escape(userObj.UserRoleId)} IN (
                    SELECT
                        Id
                    FROM
                        user_roles
                    WHERE
                        CompanyId = ${escape(userObj.CompanyId)}
                        AND Id = ${escape(userObj.UserRoleId)}
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

        userObj.FullName = [ userObj.FirstName, ...userObj.MiddleName ? [userObj.MiddleName] : [], userObj.SurName ].join(' ')

        try
        {
            const result = await sql`
                INSERT INTO
                    users
                SET
                    CompanyId    = ${userObj.CompanyId},
                    UserRoleId   = ${userObj.UserRoleId},
                    FullName     = ${userObj.FullName},
                    FirstName    = ${userObj.FirstName},
                    MiddleName   = ${userObj.MiddleName ?? null},
                    SurName      = ${userObj.SurName},
                    ProfileImage = ${userObj.ProfileImage ?? null},
                    HiredDate    = ${nullableEpoch(userObj.HiredDate)},
                    FiredDate    = ${nullableEpoch(userObj.FiredDate)}`

            userObj.Id = result.insertId

            log.silly(`User was created:\n${JSON.stringify(userObj, null, 2)}`)

            if(userObj.LocationIds.length)
            {
                await sql`
                    INSERT INTO
                        x_user_locations
                        (
                            UserId,
                            LocationId
                        )
                    VALUES
                        ${unsafe(userObj.LocationIds.map(id => `(${escape(userObj.Id)}, ${escape(id)})`).join(','))}`
            }

            wsbroadcast(res, companyId, 'created', 'User', userObj)
            res.status(201).send(userObj)
        }
        catch(_error)
        {
            log.error(_error)
            error(res, 500, 'Unknown error')
        }
    })
}
