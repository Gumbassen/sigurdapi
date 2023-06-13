

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

import log from './utils/logger'
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
            const router = express.Router()
            router.use(nocache())
            module.default(router)
            app.use(prefix, router)
        }).catch(error => ({ error, path }))
    })).catch(errors =>
    {
        for(const { error, path } of errors)
            log.error(`Failed to import route endpoint file "${path}": "${error}"`)
    }),

    // Connects to MySQL
    database.initialize(),
]).then(() =>
{
    // Confirm that the permissions table is properly filled
    log.info('⚡ [SERVER] Verifying user role permissions table')
    return userpermissions.verifyDatabase()
}).then(() =>
{
    // Start the server
    const server = app.listen(port, () =>
    {
        log.info(`⚡ [EXPRESS] Listening on port ${port}`)
    })

    wsserver.initialize({
        path:   '/ws',
        server: server,
    }).then(() =>
    {
        log.info('⚡ [WEBSOCKET] Initialized.')
    })

    // In order to handle 404 for pages that doesnt exist, I have to add the middleware as the last in the stack.
    app.use(notfound404())
}).catch(errors =>
{
    const errorMessage = Array.isArray(errors) ? errors.map(String).join('\n\t') : String(errors)
    log.error(`🚑 [SERVER] Failed to start...\n\t${errorMessage}`)
})
