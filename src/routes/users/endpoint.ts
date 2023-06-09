import { Router, Request, Response } from 'express'
import { error } from '../../utils/common'
import { FetchUsersOption, FetchUsersDateOption, FetchUsersNumberOption, fetchUsers } from '../../utils/fetchfunctions'
import { digitStringRx, pipeDelimitedNumbersRx } from '../../utils/regexes'

export default function(router: Router)
{
    router.get('/', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const query     = req.query

        const queryClauses: FetchUsersOption[] = []

        const numberFields: { [_: string]: FetchUsersNumberOption['field'] } = {
            location:  'LocationId',
            user:      'Id',
            role:      'UserRoleId',
            leadersOf: 'leadersOf',
        }
        for(const param in numberFields)
        {
            if(!(param in query))
                continue

            const values = query[param]

            if(typeof values !== 'string' || !pipeDelimitedNumbersRx.test(values))
                return error(res, 400, `Param "${param}" should be a pipe-delimited string`)

            const ids: number[] = []
            for(const value of values.split('|'))
            {
                const parsed = Number.parseInt(value)

                if(Number.isNaN(parsed) || parsed < 1)
                    return error(res, 400, `Param "${param}" contains invalid entries`)

                if(ids.includes(parsed))
                    continue

                ids.push(parsed)
            }

            if(!ids.length)
                return error(res, 400, `Param "${param}" must be omitted or contain at least one entry`)

            queryClauses.push({ field: numberFields[param], value: ids })

        }

        const dateFields: { [_: string]: FetchUsersDateOption['field'] } = {
            hiredBefore: 'hiredBefore',
            firedBefore: 'firedBefore',
            hiredAfter:  'hiredAfter',
            firedAfter:  'firedAfter',
        }
        for(const param in dateFields)
        {
            if(!(param in query))
                continue

            const value = query[param]

            if(typeof value !== 'string' || !digitStringRx.test(value))
                return error(res, 400, `Param "${param}" should be a digit-string`)

            const parsed = Number.parseInt(value)

            if(Number.isNaN(parsed) || parsed < 0)
                return error(res, 400, `Param "${param}" is invalid`)

            queryClauses.push({ field: dateFields[param], value: parsed })
        }

        res.send(Array.from((await fetchUsers(companyId, queryClauses)).values()))
    })
}
