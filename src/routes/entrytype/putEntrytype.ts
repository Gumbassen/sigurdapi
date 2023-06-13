import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { fetchTimeEntryType } from '../../utils/fetchfunctions'
import isValidKeyOf from '../../utils/isvalidkeyof'
import { escape, sql, unsafe } from '../../utils/database'
import log from '../../utils/logger'

type ApiTimeEntryType = ApiDataTypes.Objects.TimeEntryType

export default function(router: Router)
{
    router.put('/:typeId', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const typeId    = Number.parseInt(req.params.typeId)

        const updateableProps: (keyof ApiTimeEntryType)[] = ['Name']

        if(Number.isNaN(typeId))
            return error(res, 400, 'Invalid URL')

        const type = await fetchTimeEntryType(companyId, typeId, false)
        if(!type) return error(res, 404, 'Timeentry type not found')


        // Starts out as a copy of the original object
        const updatedType: Partial<ApiTimeEntryType> = Object.assign({}, type)
        for(const field of Object.keys(updatedType) as (keyof ApiTimeEntryType)[])
        {
            if(!updateableProps.includes(field))
                delete updatedType[field]
        }

        // Replace any given fields in the "update" object
        for(const field in req.body)
        {
            if(!isValidKeyOf<ApiTimeEntryType>(field, updateableProps))
                return error(res, 400, `Param "${field}" is not updateable or is otherwise invalid.`)

            const value = req.body[field] as string | null

            if(value === null)
                return error(res, 400, `Param "${field}" is not nullable. Omit the parameter if you wish not to update it.`)

            switch(field)
            {
                case 'Name':
                    if(!value.length)
                        return error(res, 400, `Param "${field}" is invalid (must be a non-empty string).`)
                    updatedType[field] = value
                    break
            }
        }


        const permissionChecks = new Map<string, string>()

        if(updatedType.Name !== type.Name)
        {
            permissionChecks.set('Name', /*SQL*/`(
                (
                    SELECT
                        COUNT(tet.Name) = 0
                    FROM
                        time_entry_types AS tet
                    WHERE
                        tet.CompanyId = ${escape(companyId)}
                        AND tet.Name = ${escape(updatedType.Name)}
                )
            ) AS Name `)
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

        const updateSet: string[]     = []
        for(const field of updateableProps)
        {
            if(type[field] === updatedType[field])
                continue

            switch(field)
            {
                // Strings and numbers
                case 'Name':
                    updateSet.push(/*SQL*/`${field} = ${escape(updatedType[field])}`)
                    break
            }
        }


        const queries = []
        if(updateSet.length)
        {
            queries.push(sql`
                UPDATE
                    time_entry_types
                SET
                    ${unsafe(updateSet.join(','))}
                WHERE
                    Id = ${typeId}
                    AND CompanyId = ${companyId}
                LIMIT 1
            `)
        }

        if(!queries.length) // No changes then
            return res.send(type)

        await Promise.all(queries).catch(_error =>
        {
            log.error(_error)
            return Promise.reject(_error)
        })

        const fetched = await fetchTimeEntryType(companyId, typeId, false)
        if(!fetched) return error(res, 500, 'Timeentry type could not be returned')
        wsbroadcast(res, companyId, 'updated', 'TimeEntryType', fetched)
        res.send(fetched)
    })
}
