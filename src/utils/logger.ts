
import winston, { Logger } from 'winston'


const jsonFormatting = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
)

const log: Logger = winston.createLogger()

if(process.env.LOG_PERSISTENT_ERROR !== '0')
{
    log.add(new winston.transports.File({
        filename: `${process.cwd()}/logs/error.log`,
        level:    'error',
        format:   jsonFormatting,
    }))
}

if(process.env.LOG_PERSISTENT_DEBUG !== '0')
{
    log.add(new winston.transports.File({
        filename: `${process.cwd()}/logs/debug.log`,
        level:    'info',
        format:   jsonFormatting,
    }))
}

if(process.env.LOG_PERSISTENT_EXCEPTIONS !== '0')
{
    log.add(new winston.transports.File({
        filename:         `${process.cwd()}/logs/exceptions.log`,
        level:            'error',
        format:           jsonFormatting,
        handleExceptions: true,
    }))
}

log.add(new winston.transports.Console({
    format: winston.format.combine(
        winston.format.json(),
        winston.format.errors({ stack: true }),
        winston.format.prettyPrint({ colorize: true }),
    ),
    level:            'error',
    handleExceptions: true,
}))

if(process.env.NODE_ENV !== 'production')
{
    // Only write to console if not in production
    log.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.cli(),
        ),
        level: 'silly',
    }))
}


log.info(`⚡ Running in "${process.env.NODE_ENV}" mode`)

export default log
