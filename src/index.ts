

// Environment setup
import './utils/extensions'
import express from 'express'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()
let usingDotenvExample = false
if(!fs.existsSync('./.env'))
{
    usingDotenvExample = true
    dotenv.config({ path: './.env.example' })
}

import log, { getNamedLogger } from './utils/logger'
import swaggerUi from 'swagger-ui-express'
import swaggerDefinitions from './static/openapi.json'
import fsrecursivesearch from './utils/fsrecursivesearch'
import authmw from './middlewares/auth'
import mapiterator from './utils/mapiterator'
import database from './utils/database'
import userpermissions from './utils/userpermissions'
import nocache from 'nocache'
import requestlog from './middlewares/requestlog'
import notfound404 from './middlewares/notfound404'
import wsserver from './wsserver/wsserver'
import asyncwait from './utils/asyncwait'

if(usingDotenvExample)
{
    log.warn('\n'
        + '##################################################\n'
        + '#                                                #\n'
        + '#   Using ".env.example" as ".env" is missing!   #\n'
        + '#                                                #\n'
        + '##################################################\n'
        + 'Please create a copy of ".env.example" and rename it to ".env"\n')
}


// Changes the working directory to the where index.ts/js is.
// Otherwise any FS stuff thinks the root directory is the working directory (should be ./dist).
process.chdir(__dirname)

process.on('SIGINT', () =>
{
    log.warn('⛔ Process interrupted.')
    process.exit()
})
process.on('exit', () => log.warn('Exiting...'))

async function handlePidLock()
{
    const log = getNamedLogger('PIDLOCK')

    const pidFilePath   = './lock.pid'
    const pidFileExists = fs.existsSync(pidFilePath)

    if(pidFileExists)
    {
        const pid  = Number.parseInt(fs.readFileSync(pidFilePath, { encoding: 'ascii' }))
        const proc = await (await import('find-process')).default('pid', pid)

        if(proc.length > 0)
        {
            if(proc[0].name == 'node.exe')
            {
                log.warn(`Another instance is already running [PID=#${pid}]. Killing...`)
                process.kill(pid, 'SIGINT')

                await asyncwait(1500)

                try
                {
                    process.kill(pid, 0)
                    log.warn('Failed to kill other instance...')
                    process.exit(1)
                }
                catch(error)
                {
                    if(!(error instanceof Error) || error.message !== 'kill ESRCH')
                        throw error
                }
            }
            else
            {
                log.warn('PID does not belong to node.exe...')
                fs.unlinkSync(pidFilePath)
            }
        }
        else
        {
            log.info(`PID #${pid} from ${pidFilePath} did not seem to match a running process. Continuing as normal.`)
            fs.unlinkSync(pidFilePath)
        }
    }

    fs.writeFileSync(pidFilePath, process.pid.toString())
    process.on('exit', () =>
    {
        if(fs.existsSync(pidFilePath))
        {
            const pid = Number.parseInt(fs.readFileSync(pidFilePath, { encoding: 'ascii' }))
            if(pid == process.pid)
                fs.unlinkSync(pidFilePath)
        }
    })
}

async function startServer(app: express.Application, port: number): Promise<void>
{
    const log = getNamedLogger('SETUP')

    // Autoloads routes
    log.verbose('Loading routes...')
    await Promise.all(mapiterator(fsrecursivesearch('./routes', ({ name }) => name === 'endpoint.js'), path =>
    {
        const prefixRx       = /^\.\/routes((?:\/\w+)+)\/endpoint.js$/g
        const prefixRxResult = prefixRx.exec(path)
        if(prefixRxResult === null) return Promise.reject({ error: 'Invalid route path', path })
        const prefix = prefixRxResult[1]

        return import(path).then(module =>
        {
            log.silly(`Added ${`"${prefix}"`.padEnd(12, ' ')} from ${path}`)
            const router = express.Router()
            router.use(nocache())
            module.default(router)
            app.use(prefix, router)
        }).catch(error => ({ error, path }))
    })).catch(errors =>
    {
        for(const { error, path } of errors)
            log.error(`Failed to import route endpoint file "${path}"`, error)
        throw new Error('Some routes failed to load')
    })
    
    // Connects to MySQL
    log.verbose('Initializing database...')
    await database.initialize()

    // Confirm that the permissions table is properly filled
    log.verbose('Verifying user role permissions table...')
    await userpermissions.verifyDatabase()

    // Start the server
    await new Promise<void>(resolve =>
    {
        const resolved: Record<string, boolean> = { express: false, websocket: false }
        const done = (name: string) =>
        {
            if(!(name in resolved)) throw new Error(`what? name is foobar'd "${name}"`)
            resolved[name] = true
            if(Object.values(resolved).some(v => !v)) return
            resolve()
        }

        const server = app.listen(port, () =>
        {
            log.info(`Express is listening! (port: ${port})`)
            done('express')
        })
    
        wsserver.initialize({
            path:   '/ws',
            server: server,
        }).then(() =>
        {
            log.info('WebSocket is listening!')
            done('websocket')
        })
    })
}

async function main()
{
    const app  = express()
    const port = Number.parseInt(process.env.PORT ?? '6969')

    // Remove the "x-powered-by: Express" header
    app.disable('x-powered-by')

    // Disable ETag header (disables some caching)
    app.set('etag', false)

    // Initialize middlewares
    app.use(express.json())
    app.use(requestlog())
    app.use(database.middleware())
    app.use(authmw({
        insecureFilter: request =>
        {
            if([ '/auth/authenticate', '/auth/refresh' ].includes(request.url))
                return true
    
            if(request.url.startsWith('/swagger'))
                return true
    
            if(request.url.startsWith('/static'))
                return true
    
            return false
        },
        accessFilters: [],
    }))
    app.use(wsserver.middleware())


    // Swagger routes
    app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDefinitions))


    await startServer(app, port).catch(errors =>
    {
        const errorMessage = Array.isArray(errors) ? errors.map(String).join('\n\t') : String(errors)
        throw new Error(`🚑 [SERVER] Failed to start...\n\t${errorMessage}`)
    })
  
    // In order to handle 404 for pages that doesnt exist, I have to add the middleware as the last in the stack.
    app.use(notfound404())
}

handlePidLock().then(() => main())
