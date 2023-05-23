

// Environment setup
import express from 'express'
import log from './utils/logger'
import dotenv from 'dotenv'
import fsrecursivesearch from './utils/fsrecursivesearch'
dotenv.config()

// Changes the working directory to the where index.ts/js is.
// Otherwise any FS stuff thinks the root directory is the working directory (should be ./dist).
process.chdir(__dirname)


const app  = express()
const port = Number.parseInt(process.env.PORT ?? '6969')


app.get('/', (req, res) =>
{
    // This shit is just for debugging
    // Dont mind
    log.http('Hello world was visited.')
    res.send('Hello World!')
})



// Autoload routes from the routes folder
for(const path of fsrecursivesearch('./routes', ({ name }) => name === 'endpoint.js'))
{
    const prefixRx       = /^\.\/routes((?:\/\w+)+)\/endpoint.js$/g
    const prefixRxResult = prefixRx.exec(path)
    if(prefixRxResult === null) continue
    const prefix = prefixRxResult[1]

    log.info(`Autoloading route: "${prefix}" from "${path}"`)

    import(path)
        .then(({ router }) =>
        {
            app.use(prefix, router)
        }).catch(error =>
        {
            log.error(`Failed to import route endpoint file "${path}": "${error}"`)
        })
}



// Start the server
app.listen(port, () =>
{
    log.info(`⚡ [SERVER] Listening on port ${port}`)
})
