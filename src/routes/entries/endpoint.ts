import { Router, Request, Response } from 'express'
import log from '../../utils/Logger'
import { error } from '../../utils/common'
import { digitStringRx, pipeDelimitedAlphanumRx, pipeDelimitedNumbersRx } from '../../utils/helpers/regexes'
import {
    EFetchTimeEntriesDataListOptions,
    FetchTimeEntriesDateOption,
    FetchTimeEntriesNumberOption,
    FetchTimeEntriesOption,
    FetchTimeEntriesStringOption,
    fetchTimeEntries
} from '../../utils/fetchfunctions'

export default function(router: Router)
{
    router.get('/', async (req: Request, res: Response) =>
    {
        const token     = res.locals.accessToken!
        const companyId = token.getPayloadField('cid')
        const query     = req.query

        const fetchClauses: FetchTimeEntriesOption[] = []

        const numberOptions: { [_: string]: FetchTimeEntriesNumberOption['field'] } = {
            location: 'LocationId',
            user:     'UserId',
            group:    'GroupingId',
            type:     'TimeEntryTypeId',
        }

        for(const param in numberOptions)
        {
            if(!(param in query))
                continue

            const values = query[param]

            if(typeof values !== 'string' || !pipeDelimitedNumbersRx.test(values))
                return error(res, 400, `Param "${param}" should be a pipe-delimited digit-string`)

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

            fetchClauses.push({ field: numberOptions[param], value: ids })
        }

        const dateOptions: { [_: string]: FetchTimeEntriesDateOption['field'] } = {
            before: 'Before',
            after:  'After',
        }

        for(const param in dateOptions)
        {
            if(!(param in query))
                continue

            const value = query[param]

            if(typeof value !== 'string' || !digitStringRx.test(value))
                return error(res, 400, `Param "${param}" should be a digit-string`)

            const parsed = Number.parseInt(value)

            if(Number.isNaN(parsed) || parsed < 0)
                return error(res, 400, `Param "${param}" is invalid`)

            fetchClauses.push({ field: dateOptions[param], value: parsed })
        }

        const stringOptions: { [_: string]: FetchTimeEntriesStringOption['field'] } = {
            status: 'Status',
        }

        for(const param in stringOptions)
        {
            if(!(param in query))
                continue

            const value = query[param]

            if(typeof value !== 'string' || !pipeDelimitedAlphanumRx.test(value))
                return error(res, 400, `Param "${param}" should be a pipe-delimited alphanumeric string`)

            fetchClauses.push({ field: stringOptions[param], value: value.split('|') })
        }

        if('withdata' in query)
        {
            if(typeof query.withdata !== 'string' || !pipeDelimitedAlphanumRx.test(query.withdata))
                return error(res, 400, 'Param "withdata" should be a pipe-delimited alphanumeric string')

            const values = query.withdata.toLowerCase().split('|')
            
            const options: EFetchTimeEntriesDataListOptions[] = []
            for(const option in EFetchTimeEntriesDataListOptions)
            {
                const i = values.indexOf(option.toLowerCase())
                if(i === -1) continue

                options.push(EFetchTimeEntriesDataListOptions[option as keyof typeof EFetchTimeEntriesDataListOptions])
                values.splice(i, 1)
            }

            if(values.length)
                return error(res, 400, `Param "withdata" entries "${values.join('", "')}" is invalid.`)

            if(!options.length)
                return error(res, 400, 'Param "withdata" must be omitted or contain at least one entry')
            
            fetchClauses.push({ field: 'WithData', value: options })
        }


        const tagIds = []
        if('fulfillsTag' in query)
        {
            if(typeof query.fulfillsTag !== 'string')
                return error(res, 400, 'Param "fulfillsTag" should be a pipe-delimited string')

            for(const value of query.fulfillsTag.split('|'))
            {
                const tag = Number.parseInt(value)

                if(Number.isNaN(tag) || tag < 1)
                    return error(res, 400, 'Param "fulfillsTag" contains invalid entries')

                tagIds.push(tag)
            }

            if(!tagIds.length)
                return error(res, 400, 'Param "fulfillsTag" must be omitted or contain one or more entries')
        }

        const ruleIds = []
        if('fulfillsRule' in query)
        {
            if(typeof query.fulfillsRule !== 'string')
                return error(res, 400, 'Param "fulfillsRule" should be a pipe-delimited string')

            for(const value of query.fulfillsRule.split('|'))
            {
                const rule = Number.parseInt(value)

                if(Number.isNaN(rule) || rule < 1)
                    return error(res, 400, 'Param "fulfillsRule" contains invalid entries')

                ruleIds.push(rule)
            }

            if(!ruleIds.length)
                return error(res, 400, 'Param "fulfillsRule" must be omitted or contain one or more entries')
        }

        if(!fetchClauses.length)
            return error(res, 400, 'At least one constraint type parameter must be given')

        // FIXME: ADD SUPPORT FOR "fulfillsTag" AND "fulfillsRule"
        if(tagIds.length)
        {
            log.warn('Unimplemented request param "fulfillsTag"')
            return error(res, 500, 'Param "fulfillsTag" is not implemented')
        }

        if(ruleIds.length)
        {
            log.warn('Unimplemented request param "fulfillsRule"')
            return error(res, 500, 'Param "fulfillsRule" is not implemented')
        }

        res.send(Array.from((await fetchTimeEntries(companyId, fetchClauses)).values()))
    })
}
