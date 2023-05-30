import mysql, { ConnectionConfig } from 'mysql'
import { Response, NextFunction, RequestHandler } from 'express'
import log from './logger'

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

        case 'multipleStatements':
            value = raw !== '0'
            break
    }

    // @ts-expect-error ts(2322)
    config[field] = value
}

const connection = mysql.createConnection(config)

function middleware(): RequestHandler
{
    return function(_, res: Response, next: NextFunction)
    {
        if(![ 'connected', 'authenticated' ].includes(connection.state))
        {
            log.error(`Invalid MySQL connection state "${connection.state}"`)
            res.status(500).send('MySQL has left the lobby.').end()
            return
        }

        res.locals.db = connection
        next()
    }
}

let connectPromise: Promise<undefined> | null = null
function connect(): Promise<undefined>
{
    connectPromise ??= new Promise((resolve, reject) =>
    {
        connection.connect(err =>
        {
            if(err)
            {
                reject(`[MYSQL] Connection failed (#${err.errno} ${err.code}): ${err.sqlMessage}`)
                return
            }
    
            log.info('⚡ [MYSQL] Connected!')
            resolve(undefined)
        })
    })
    return connectPromise
}

export class UnsafeParameter
{
    private value: string

    public constructor(value: string)
    {
        this.value = value
    }

    public getValue(): string
    {
        return this.value
    }
}

export function unsafe(sql: string): UnsafeParameter
{
    return new UnsafeParameter(sql)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function escape(value: any): string
{
    return connection.escape(value)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sql<TReturn = any>(strings: TemplateStringsArray, ...tags: any[]): Promise<TReturn>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sql<TReturn = any>(sql: string, ...values: any[]): Promise<TReturn>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sql<TReturn = any>(sqlParts: TemplateStringsArray | string | string[], ...values: any[]): Promise<TReturn>
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preparedValues: any[] = []
    const preparedSql: string[] = []
    for(let i = 0; i < values.length; i++)
    {
        const value = values[i]
        const sql   = sqlParts[i]
        if(value instanceof UnsafeParameter)
        {
            preparedSql.push(sql)
            preparedSql.push(value.getValue())
            continue
        }

        if(Array.isArray(value) && !value.length)
        {
            preparedSql.push(sql)
            preparedSql.push('?')
            preparedValues.push('')
            continue
        }

        preparedSql.push(sql)
        preparedSql.push('?')
        preparedValues.push(value)
    }
    preparedSql.push(sqlParts.at(-1)!)

    return new Promise((resolve, reject) =>
    {
        connection.query(
            preparedSql.join(''),
            preparedValues,
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
            },
        )
    })
}

export default {
    config,
    connection,
    connect,
    middleware,
    sql,
    unsafe,
    UnsafeParameter,
    escape,
}
