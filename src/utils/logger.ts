import fs from 'fs'
import { dirname } from 'path'
import { Logger, ILogObj } from 'tslog'
import { ILogObjMeta } from 'tslog/dist/types/interfaces'

const logsDir = dirname(require.main!.filename) + '/../logs/'
const logger: Logger<ILogObj> = new Logger()

export const enum LOG_LEVELS {
    SILLY   = 0,
    DEBUG   = 1,
    VERBOSE = 2,
    HTTP    = 3,
    INFO    = 4,
    WARN    = 5,
    ERROR   = 6,
    FATAL   = 7,
}

function createFileLoggerTransport(levels: LOG_LEVELS[], filename: string)
{
    const file = logsDir + filename
    if(!fs.existsSync(logsDir)) fs.mkdirSync(logsDir)
    if(!fs.existsSync(file)) fs.writeFileSync(file, '', { encoding: 'utf-8', flag: 'a' })

    return (logObj: ILogObj & ILogObjMeta) =>
    {
        if(!levels.includes(logObj._meta.logLevelId)) return

        let msg = ''
        for(let i = 0; typeof logObj[i] !== 'undefined'; i++)
            msg += logObj[i]

        

        fs.appendFileSync(
            file,
            `[${logObj._meta.date.format('yyyy-mm-dd hh:ii:ss.uuu')}] ${logObj._meta.logLevelName}: ${msg}\n`,
            'utf-8'
        )
    }
}

if(process.env.LOG_PERSISTENT_ERROR !== '0')
{
    logger.attachTransport(createFileLoggerTransport([
        LOG_LEVELS.ERROR,
        LOG_LEVELS.FATAL,
    ], 'error.log'))
}

if(process.env.LOG_PERSISTENT_DEBUG !== '0')
{
    logger.attachTransport(createFileLoggerTransport([
        LOG_LEVELS.SILLY,
        LOG_LEVELS.DEBUG,
        LOG_LEVELS.VERBOSE,
        LOG_LEVELS.HTTP,
        LOG_LEVELS.INFO,
        LOG_LEVELS.WARN,
        LOG_LEVELS.ERROR,
        LOG_LEVELS.FATAL,
    ], 'debug.log'))
}

interface WinstonLikeLogger
{
    silly:   (...args: unknown[]) => (ILogObj & ILogObjMeta) | undefined
    debug:   (...args: unknown[]) => (ILogObj & ILogObjMeta) | undefined
    verbose: (...args: unknown[]) => (ILogObj & ILogObjMeta) | undefined
    http:    (...args: unknown[]) => (ILogObj & ILogObjMeta) | undefined
    info:    (...args: unknown[]) => (ILogObj & ILogObjMeta) | undefined
    warn:    (...args: unknown[]) => (ILogObj & ILogObjMeta) | undefined
    error:   (...args: unknown[]) => (ILogObj & ILogObjMeta) | undefined
    fatal:   (...args: unknown[]) => (ILogObj & ILogObjMeta) | undefined
}

const exported: WinstonLikeLogger = {
    /* eslint-disable brace-style */
    get silly()   { return logger.log.bind(logger, 0, 'SILLY') },
    get debug()   { return logger.log.bind(logger, 1, 'DEBUG') },
    get verbose() { return logger.log.bind(logger, 2, 'VERBOSE') },
    get http()    { return logger.log.bind(logger, 3, 'HTTP') },
    get info()    { return logger.log.bind(logger, 4, 'INFO') },
    get warn()    { return logger.log.bind(logger, 5, 'WARN') },
    get error()   { return logger.log.bind(logger, 6, 'ERROR') },
    get fatal()   { return logger.log.bind(logger, 7, 'FATAL') },
    /* eslint-enable brace-style */
}

process.on('uncaughtException',  exception => exported.fatal('Uncaught exception:',  exception))
process.on('unhandledRejection', rejection => exported.fatal('Unhandled rejection:', rejection))

exported.info(`⚡ Running in "${process.env.NODE_ENV}" mode`)

export default exported
