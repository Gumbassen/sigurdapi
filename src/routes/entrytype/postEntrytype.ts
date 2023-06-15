import { Router, Request, Response } from 'express'
import { error, wsbroadcast } from '../../utils/common'
import { escape, sql, unsafe } from '../../utils/database'
import log from '../../utils/Logger'

type ApiTimeEntryType = ApiDataTypes.Objects.TimeEntryType

export default function(router: Router)
{
    router.post('/', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')

        const requiredProps: (keyof ApiTimeEntryType)[] = ['Name']

        const type: Partial<ApiTimeEntryType> = {
            CompanyId: companyId,
        }

        for(const field of requiredProps)
        {
            if(!(field in req.body) || req.body[field] === null)
                return error(res, 400, `Param "${field}" is required.`)

            const value = req.body[field]
            switch(field)
            {
                case 'Name':
                    if(typeof value !== 'string')
                        return error(res, 400, `Param "${field}" must be a string.`)

                    if(!value.length)
                        return error(res, 400, `Param "${field}" cannot be empty.`)

                    type[field] = value
                    break
            }
        }


        const permissionChecks = new Map<string, string>()
        if(type.Name)
        {
            permissionChecks.set('Name', /*SQL*/`(
                SELECT
                    COUNT(tet.Id) = 0
                FROM
                    time_entry_types AS tet
                WHERE
                    tet.CompanyId = ${escape(type.CompanyId)}
                    AND tet.Name IN (${escape(type.Name)})
                GROUP BY
                    tet.Id
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

        try
        {
            const result = await sql`
                INSERT INTO
                    time_entry_types
                SET
                    CompanyId = ${type.CompanyId},
                    Name      = ${type.Name}`
            type.Id = result.insertId

            log.silly(`Timeentry type was created:\n${JSON.stringify(type, null, 2)}`)

            wsbroadcast(res, companyId, 'created', 'TimeEntryType', type)
            res.status(201).send(type)
        }
        catch(_error)
        {
            log.error(_error)
            error(res, 500, 'Unknown error')
        }
    })
}
