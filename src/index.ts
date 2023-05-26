

// Environment setup
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

import log from './utils/logger'
import swagger from 'swagger-ui-dist'
import fsrecursivesearch from './utils/fsrecursivesearch'
import authmw from './middlewares/auth'
import mapiterator from './utils/mapiterator'
import database from './utils/database'

if(usingDotenvExample)
{
    log.warn('##############################################')
    log.warn('# Using ".env.example" as ".env" is missing! #')
    log.warn('##############################################')
    log.warn('Please create a copy of ".env.example" and rename it to ".env"')
}


// Changes the working directory to the where index.ts/js is.
// Otherwise any FS stuff thinks the root directory is the working directory (should be ./dist).
process.chdir(__dirname)


const app  = express()
const port = Number.parseInt(process.env.PORT ?? '6969')

// Remove the "x-powered-by: Express" header
app.disable('x-powered-by')

// Disable ETag header (disables some caching)
app.set('etag', false)

// Initialize middlewares
app.use((req, res, next) =>
{
    log.debug(`[HTTP] [${req.method}] ${req.url}`)
    next()
})
app.use(database.middleware())
app.use(express.json())
app.use(authmw({
    insecureFilter: request =>
    {
        if([ '/auth/authenticate', '/auth/refresh', '/' ].includes(request.url))
            return true

        if(request.url.startsWith('/swagger'))
            return true

        if(request.url.startsWith('/static'))
            return true

        return false
    },
}))


// This shit is just for debugging
// Dont mind
app.get('/', (_, res) =>
{
    log.info('Hello world was visited.')
    res.send('Hello World!')
})

// Swagger routes
app.use('/swagger', express.static(swagger.absolutePath()))
app.use('/static', express.static('./../static'))


Promise.all([
    // Autoloads routes
    Promise.all(mapiterator(fsrecursivesearch('./routes', ({ name }) => name === 'endpoint.js'), path =>
    {
        const prefixRx       = /^\.\/routes((?:\/\w+)+)\/endpoint.js$/g
        const prefixRxResult = prefixRx.exec(path)
        if(prefixRxResult === null) return Promise.reject(`Invalid route path: ${path}`)
        const prefix = prefixRxResult[1]

        return import(path).then(module =>
        {
            log.verbose(`Autoloading route: "${prefix}" from "${path}"`)
            app.use(prefix, module.default)
        }).catch(error => ({ error, path }))
    })).catch(errors =>
    {
        for(const { error, path } of errors)
            log.error(`Failed to import route endpoint file "${path}": "${error}"`)
    }),

    // Connects to MySQL
    database.connect(),
]).then(() =>
{
    // Start the server
    app.listen(port, () =>
    {
        log.info(`⚡ [EXPRESS] Listening on port ${port}`)
    })
}).catch(errors =>
{
    const errorMessage = Array.isArray(errors) ? errors.map(String).join('\n\t') : String(errors)
    log.error(`🚑 [SERVER] Failed to start...\n\t${errorMessage}`)
})
