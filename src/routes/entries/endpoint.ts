
import express, { Request, Response } from 'express'
import endpoint from '../../utils/endpoint'
import log from './../../utils/logger'
import { sql } from '../../utils/database'

const router = express.Router()


router.get('/', async (req: Request, res: Response) =>
{
    const error = (reason: string) =>
    {
        res.status(400).send(JSON.stringify({
            ErrorCode: -1,
            Reason:    reason,
        }))
    }

    const query = req.query

    let   numClauses = 0
    const values     = []
    const clauses    = []

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    values.push(res.locals.accessToken!.getPayloadField('cid'))

    log.info(query.location)

    if('location' in query)
    {
        if(!Array.isArray(query.location))
            return error('Param "location" should be an array')

        const locations = []
        for(const value of query.location)
        {
            const location = Number.parseInt((value ?? '') as string)

            if(Number.isNaN(location) || location <= 1)
                return error('Param "location" contains invalid entries')

            locations.push(location)
        }

        if(!locations.length)
            return error('Param "location" must be omitted or contain one or more entries')

        numClauses++
        values.push(locations)
        clauses.push('LocationId IN (?)')
    }

    if('user' in query)
    {
        if(!Array.isArray(query.user))
            return error('Param "user" should be an array')

        const users = []
        for(const value of query.user)
        {
            const user = Number.parseInt((value ?? '') as string)

            if(Number.isNaN(user) || user <= 1)
                return error('Param "user" contains invalid entries')

            users.push(user)
        }

        if(!users.length)
            return error('Param "user" must be omitted or contain one or more entries')

        numClauses++
        values.push(users)
        clauses.push('UserId IN (?)')
    }

    if('group' in query)
    {
        if(!Array.isArray(query.group))
            return error('Param "group" should be an array')

        const groupingIds = []
        for(const value of query.group)
        {
            const group = Number.parseInt((value ?? '') as string)

            if(Number.isNaN(group) || group <= 1)
                return error('Param "group" contains invalid entries')

            groupingIds.push(group)
        }

        if(!groupingIds.length)
            return error('Param "group" must be omitted or contain one or more entries')

        numClauses++
        values.push(groupingIds)
        clauses.push('GroupingId IN (?)')
    }




    log.info({
        values,
        clauses,
        numClauses,
    })
    


    // const result = await sql(
    //     `SELECT
    //         Id,
    //         UserId,
    //         UNIX_TIMESTAMP(Start) AS 'Start',
    //         UNIX_TIMESTAMP(End)   AS 'End',
    //         Duration,
    //         GroupingId,
    //         LocationId,
    //         TimeEntryTypeId
    //     FROM
    //         timeentries
    //     WHERE
    //         CompanyId = ?
    //         AND (${clauses.join(') AND (')})`,
    // )

    res.send(JSON.stringify({
        values,
        clauses,
        numClauses,
    }) + '\n\n' + `SELECT
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
            CompanyId = ?
            AND (${clauses.join(') AND (')})`)
})


export default endpoint(router, {})
