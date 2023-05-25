

// Environment setup
import express from 'express'
import log from './utils/logger'
import dotenv from 'dotenv'
import swagger from 'swagger-ui-dist'
import fsrecursivesearch from './utils/fsrecursivesearch'
import authmw from './middlewares/auth'
import mapiterator from './utils/mapiterator'
dotenv.config()

// Changes the working directory to the where index.ts/js is.
// Otherwise any FS stuff thinks the root directory is the working directory (should be ./dist).
process.chdir(__dirname)


const app  = express()
const port = Number.parseInt(process.env.PORT ?? '6969')

// Initialize middlewares
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
app.get('/', (req, res) =>
{
    log.http('Hello world was visited.')
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
]).then(() =>
{
    // Start the server
    app.listen(port, () =>
    {
        log.info(`⚡ [SERVER] Listening on port ${port}`)
    })
}).catch(errors =>
{
    log.error(`Failed to start...\n\t${errors.map(String).join('\n\t')}`)
})
