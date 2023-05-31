/* eslint-disable @typescript-eslint/no-explicit-any */
import mysql, { Connection, ConnectionConfig } from 'mysql'
import { Response, NextFunction, RequestHandler } from 'express'
import log from './logger'
import { error } from './common'

const allowed: (keyof ConnectionConfig)[] = [
    'host',
    'port',
    'user',
    'password',
    'database',
    'charset',
    'multipleStatements',
]

const config: ConnectionConfig = {}
for(const field of allowed)
{
    const envName = `MYSQL_${field.toUpperCase()}`
    if(!(envName in process.env)) continue
    const raw = process.env[envName]!

    let value
    switch(field)
    {
        case 'host':
        case 'user':
        case 'password':
        case 'database':
        case 'charset':
            value = raw
            break

        case 'port':
            value = Number.parseInt(raw)
            if(Number.isNaN(value)) value = 3306
            break
    }

    // @ts-expect-error ts(2322)
    config[field] = value
}

export interface ConnectionStore {
    single: Connection
    multi:  Connection
}

const connections: ConnectionStore = {
    single: mysql.createConnection(Object.assign({}, config, { multipleStatements: false })),
    multi:  mysql.createConnection(Object.assign({}, config, { multipleStatements: true })),
}

function middleware(): RequestHandler
{
    return function(_, res: Response, next: NextFunction)
    {
        for(const name in connections)
        {
            const connection = connections[name as keyof ConnectionStore]

            if(![ 'connected', 'authenticated' ].includes(connection.state))
            {
                log.error(`Invalid MySQL connection state "${connection.state}" for the "${name}" connection`)
                return error(res, 500, 'MySQL has left the lobby.')
            }
        }

        next()
    }
}

let connectPromise: Promise<unknown[]> | null = null
function initialize(): Promise<unknown[]>
{
    connectPromise ??= Promise.all(Object.entries(connections).map(([ name, connection ]) => new Promise((resolve, reject) =>
    {
        connection.connect((err: any) =>
        {
            if(err)
            {
                reject(`[MYSQL] Connection "${name}" failed (#${err.errno} ${err.code}): ${err.sqlMessage}`)
                return
            }

            log.info(`⚡ [MYSQL] Connected "${name}"!`)
            resolve(undefined)
        })
    })))

    return connectPromise
}

export class UnsafeParameter
{
    public constructor(private readonly value: string)
    {
        this.value = value
    }

    public getValue(): string
    {
        return this.value
    }
}

export class EscapedParameter<T>
{
    static escapeWith: Connection = connections.single

    public constructor(private readonly value: T)
    {
        this.value = value
    }

    public getValue(): T
    {
        return this.value
    }

    public toString(): string // No other way to maintain backwards compatability without refactoring how queries is made throughout the whole codebase
    {
        return EscapedParameter.escapeWith.escape(this.getValue())
    }
}

export function unsafe(sql: string): UnsafeParameter
{
    return new UnsafeParameter(sql)
}

export function escape<T = any>(value: T): EscapedParameter<T>
{
    return new EscapedParameter<T>(value)
}

interface PreparedQuery {
    sql:    string
    values: any[]
}

function prepareQuery(parts: string | string[] | TemplateStringsArray, values: any[]): PreparedQuery
{
    if(typeof parts === 'string') // Easy way to handle funky calls
        return prepareQuery([ parts, '' ], values)

    if(!values.length)
    {
        return {
            sql:    parts.join(''),
            values: [],
        }
    }

    const preppedVals: any[]   = []
    const preppedSql: string[] = []
    for(let i = 0; i < values.length; i++)
    {
        const value = values[i]
        const sql   = parts[i]

        if(value instanceof UnsafeParameter)
        {
            preppedSql.push(sql)
            preppedSql.push(value.getValue())
            continue
        }

        preppedSql.push(sql)
        preppedSql.push('?')
        if(value instanceof EscapedParameter)
        {
            preppedVals.push(value.getValue())
            continue
        }
        preppedVals.push(value)
    }
    preppedSql.push(parts.at(-1)!)

    return {
        sql:    preppedSql.join(''),
        values: preppedVals,
    }
}

function runQuery<T = any>(connection: Connection, { sql, values }: PreparedQuery): Promise<T>
{
    return new Promise<T>((resolve, reject) =>
    {
        connection.query(
            sql,
            values,
            (error, results) =>
            {
                if(error)
                {
                    const message = `[MYSQL] Query failed (#${error.errno} ${error.code}): ${error.sqlMessage}`
                    log.error(`${message}\nSQL: ${error.sql}`)
                    reject(error)
                    return
                }
                resolve(results)
            }
        )
    })
}

export function sql<T = any>(strings: TemplateStringsArray, ...tags: any[]): Promise<T>
export function sql<T = any>(sql: string, ...values: any[]): Promise<T>
export function sql<T = any>(sqlParts: TemplateStringsArray | string | string[], ...values: any[]): Promise<T>
{
    EscapedParameter.escapeWith = connections.single
    return runQuery<T>(connections.single, prepareQuery(sqlParts, values))
}

export function sqlMulti<T = any>(strings: TemplateStringsArray, ...tags: any[]): Promise<T>
export function sqlMulti<T = any>(sql: string, ...values: any[]): Promise<T>
export function sqlMulti<T = any>(sqlParts: TemplateStringsArray | string | string[], ...values: any[]): Promise<T>
{
    EscapedParameter.escapeWith = connections.multi
    return runQuery<T>(connections.multi, prepareQuery(sqlParts, values))
}

export function nullableEpoch(timestamp: number | null | undefined): Date | null
{
    if(timestamp == null || Number.isNaN(timestamp) || !Number.isInteger(timestamp) || timestamp == 0)
        return null

    if(timestamp < 0)
        throw new Error('I have decreed that timestamps SHALL be positive numbers only! Check your request data for errors.')

    const date = new Date(timestamp)

    if(date.getFullYear() > 2200 || date.getFullYear() <= 1970)
        log.warn(`Got a date thats probably wrong: ${timestamp} = ${date.toISOString()}`)
        
    return date
}

export default {
    config,
    connection: connections.single,
    connections,
    initialize,
    middleware,
    sql,
    sqlMulti,
    unsafe,
    UnsafeParameter,
    EscapedParameter,
    escape,
}
