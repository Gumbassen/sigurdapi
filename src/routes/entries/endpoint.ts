/* eslint-disable consistent-return */

import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'
import database, { sql, unsafe } from '../../utils/database'
const escape = database.connection.escape.bind(database.connection)

const router = express.Router()


router.get('/', async (req: Request, res: Response) =>
{
    const error = (reason: string): void =>
    {
        res.status(400).send(JSON.stringify({
            ErrorCode: -1,
            Reason:    reason,
        }))
    }

    const query = req.query

    let   numClauses   = 0
    const queryClauses = []

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const companyId = res.locals.accessToken!.getPayloadField('cid')

    if('location' in query)
    {
        if(typeof query.location !== 'string')
            return error('Param "location" should be a pipe-delimited string')

        const locations = []
        for(const value of query.location.split('|'))
        {
            const location = Number.parseInt(value)

            if(Number.isNaN(location) || location < 1)
                return error('Param "location" contains invalid entries')

            locations.push(location)
        }

        if(!locations.length)
            return error('Param "location" must be omitted or contain one or more entries')

        numClauses++
        queryClauses.push(`LocationId IN (${escape(locations)})`)
    }

    if('user' in query)
    {
        if(typeof query.user !== 'string')
            return error('Param "user" should be a pipe-delimited string')

        const users = []
        for(const value of query.user.split('|'))
        {
            const user = Number.parseInt(value)

            if(Number.isNaN(user) || user < 1)
                return error('Param "user" contains invalid entries')

            users.push(user)
        }

        if(!users.length)
            return error('Param "user" must be omitted or contain one or more entries')

        numClauses++
        queryClauses.push(`UserId IN (${escape(users)})`)
    }

    if('group' in query)
    {
        if(typeof query.group !== 'string')
            return error('Param "group" should be a pipe-delimited string')

        const groupingIds = []
        for(const value of query.group.split('|'))
        {
            const group = Number.parseInt(value)

            if(Number.isNaN(group) || group < 1)
                return error('Param "group" contains invalid entries')

            groupingIds.push(group)
        }

        if(!groupingIds.length)
            return error('Param "group" must be omitted or contain one or more entries')

        numClauses++
        queryClauses.push(`GroupingId IN (${escape(groupingIds)})`)
    }

    if('type' in query)
    {
        if(typeof query.type !== 'string')
            return error('Param "type" should be a pipe-delimited string')

        const typeIds = []
        for(const value of query.type.split('|'))
        {
            const type = Number.parseInt(value)

            if(Number.isNaN(type) || type < 1)
                return error('Param "type" contains invalid entries')

            typeIds.push(type)
        }

        if(!typeIds.length)
            return error('Param "type" must be omitted or contain one or more entries')

        numClauses++
        queryClauses.push(`TimeEntryTypeId IN (${escape(typeIds)})`)
    }

    if('before' in query)
    {
        if(typeof query.before !== 'string')
            return error('Param "before" should be a string')

        const before = Number.parseInt(query.before)

        if(Number.isNaN(before))
            return error('Param "before" is invalid')

        numClauses++
        queryClauses.push(`UNIX_TIMESTAMP(Start) <= ${escape(before)}`)
    }

    if('after' in query)
    {
        if(typeof query.after !== 'string')
            return error('Param "after" should be a string')

        const after = Number.parseInt(query.after)

        if(Number.isNaN(after))
            return error('Param "after" is invalid')

        numClauses++
        queryClauses.push(`UNIX_TIMESTAMP(End) >= ${escape(after)}`)
    }

    const tagIds = []
    if('fulfillsTag' in query)
    {
        if(typeof query.fulfillsTag !== 'string')
            return error('Param "fulfillsTag" should be a pipe-delimited string')

        for(const value of query.fulfillsTag.split('|'))
        {
            const tag = Number.parseInt(value)

            if(Number.isNaN(tag) || tag < 1)
                return error('Param "fulfillsTag" contains invalid entries')

            tagIds.push(tag)
        }

        if(!tagIds.length)
            return error('Param "fulfillsTag" must be omitted or contain one or more entries')
    }

    const ruleIds = []
    if('fulfillsRule' in query)
    {
        if(typeof query.fulfillsRule !== 'string')
            return error('Param "fulfillsRule" should be a pipe-delimited string')

        for(const value of query.fulfillsRule.split('|'))
        {
            const rule = Number.parseInt(value)

            if(Number.isNaN(rule) || rule < 1)
                return error('Param "fulfillsRule" contains invalid entries')

            ruleIds.push(rule)
        }

        if(!ruleIds.length)
            return error('Param "fulfillsRule" must be omitted or contain one or more entries')
    }

    if(numClauses < 1)
        return error('At least one parameter must be given')

    // FIXME: ADD SUPPORT FOR "fulfillsTag" AND "fulfillsRule"
    if(tagIds.length)
    {
        log.warn('Unimplemented request param "fulfillsTag"')
        return error('Param "fulfillsTag" is not implemented')
    }

    if(ruleIds.length)
    {
        log.warn('Unimplemented request param "fulfillsRule"')
        return error('Param "fulfillsRule" is not implemented')
    }

    const result = await sql`
        SELECT
            Id,
            UserId,
            UNIX_TIMESTAMP(Start) AS 'Start',
            UNIX_TIMESTAMP(End)   AS 'End',
            Duration,
            GroupingId,
            LocationId,
            TimeEntryTypeId
        FROM
            timeentries
        WHERE
            CompanyId = ${escape(companyId)}
            AND (${unsafe(queryClauses.join(') AND ('))})`

    res.send(JSON.stringify(result))
})


export default endpoint(router, {})
