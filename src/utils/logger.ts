import fs from 'fs'
import { hostname } from 'os'
import { dirname, normalize } from 'path'
import { Logger, ILogObj } from 'tslog'
import { ILogObjMeta, ISettings, IStackFrame } from 'tslog/dist/types/interfaces'
import { IMeta, IMetaStatic } from 'tslog/dist/types/runtime/nodejs'


const rootDir        = normalize(dirname(require.main!.filename) + '/..')
const rootDirWoDrive = normalize(rootDir.replace(/^[a-zA-Z]:/, ''))
const logsDir        = normalize(rootDir + '/logs')
const logger: Logger<ILogObj> = new Logger({
    overwrite: {
        addMeta: (() =>
        {
            const meta: IMetaStatic = {
                runtime:        'NodeJS',
                runtimeVersion: process.version,
                hostname:       hostname(),
            }
            const stackDepthLevel = 5

            const stackLineToStackFrame = (line?: string): IStackFrame =>
            {
                const pathResult: IStackFrame = {
                    fullFilePath:     undefined,
                    fileName:         undefined,
                    fileNameWithLine: undefined,
                    fileColumn:       undefined,
                    fileLine:         undefined,
                    filePath:         undefined,
                    filePathWithLine: undefined,
                    method:           undefined,
                }

                if (line != null && line.includes('    at '))
                {
                    line = line.replace(/^\s+at\s+/gm, '')

                    const errorStackLine = line.split(' (')

                    const fullFilePath = line?.slice(-1) === ')'
                        ? line?.match(/\(([^)]+)\)/)?.[1]
                        : line

                    const pathArray = fullFilePath?.includes(':')
                        ? fullFilePath?.replace('file://', '')?.replace(process.cwd(), '')?.split(':')
                        : undefined

                    // Order plays a role, runs from the back: column, line, path
                    const fileColumn       = pathArray?.pop()
                    const fileLine         = pathArray?.pop()
                    const filePath         = pathArray?.pop()
                    const filePathWithLine = normalize(`${filePath}:${fileLine}`)
                    const fileName         = filePath?.split('/')?.pop()
                    const fileNameWithLine = `${fileName}:${fileLine}`

                    if (filePath != null && filePath.length > 0)
                    {
                        pathResult.fullFilePath     = fullFilePath
                        pathResult.fileName         = fileName
                        pathResult.fileNameWithLine = fileNameWithLine
                        pathResult.fileColumn       = fileColumn
                        pathResult.fileLine         = fileLine
                        pathResult.filePath         = filePath
                        pathResult.filePathWithLine = filePathWithLine
                        pathResult.method           = errorStackLine?.[1] != null ? errorStackLine?.[0] : undefined
                    }
                }
                return pathResult
            }

            const getCallerStackFrame = (stackDepthLevel: number, error: Error = Error()): IStackFrame =>
                // eslint-disable-next-line no-extra-parens
                stackLineToStackFrame((error as Error | undefined)?.stack?.split('\n')?.filter((thisLine: string) => thisLine.includes('    at '))?.[stackDepthLevel])

            const addMeta = (settings: ISettings<ILogObj>, logObj: ILogObj, logLevelId: number, logLevelName: string): ILogObj & ILogObjMeta => ({
                ...logObj,
                [settings.metaProperty]: Object.assign({}, meta, {
                    name:         settings.name,
                    parentNames:  settings.parentNames,
                    date:         new Date(),
                    logLevelId:   logLevelId,
                    logLevelName: logLevelName,
                    path:         !settings.hideLogPositionForProduction ? getCallerStackFrame(stackDepthLevel) : undefined,
                }) as IMeta,
            }) as ILogObj & ILogObjMeta

            return (logObj, logLevelId, logLevelName) =>
            {
                const obj = addMeta(logger.settings, logObj, logLevelId, logLevelName)

                if(obj._meta.path)
                {
                    if(obj._meta.path.filePath)
                        obj._meta.path.filePath = obj._meta.path.filePath.replace(rootDirWoDrive, '')

                    if(obj._meta.path.filePathWithLine)
                        obj._meta.path.filePathWithLine = obj._meta.path.filePathWithLine.replace(rootDirWoDrive, '')
                }

                return obj
            }
        })(),
    },
})

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
    const file = normalize(`${logsDir}/${filename}`)
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

const logList = new Map<string, WinstonLikeLogger>()
export function getNamedLogger(name: string): WinstonLikeLogger
{
    if(!logList.has(name))
    {
        const formattedName = `[${name.toUpperCase()}]`

        logList.set(name, {
            /* eslint-disable brace-style */
            get silly()   { return logger.log.bind(logger, 0, 'SILLY',   formattedName) },
            get debug()   { return logger.log.bind(logger, 1, 'DEBUG',   formattedName) },
            get verbose() { return logger.log.bind(logger, 2, 'VERBOSE', formattedName) },
            get http()    { return logger.log.bind(logger, 3, 'HTTP',    formattedName) },
            get info()    { return logger.log.bind(logger, 4, 'INFO',    formattedName) },
            get warn()    { return logger.log.bind(logger, 5, 'WARN',    formattedName) },
            get error()   { return logger.log.bind(logger, 6, 'ERROR',   formattedName) },
            get fatal()   { return logger.log.bind(logger, 7, 'FATAL',   formattedName) },
            /* eslint-enable brace-style */
        })
    }
    return logList.get(name)!
}

const log: WinstonLikeLogger = {
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

process.on('uncaughtException',  exception => log.fatal('Uncaught exception:',  exception))
process.on('unhandledRejection', rejection => log.fatal('Unhandled rejection:', rejection))

log.info(`⚡ Running in "${process.env.NODE_ENV}" mode`)

export default log
