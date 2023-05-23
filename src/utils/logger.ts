
import winston, { Logger } from 'winston'
import dotenv from 'dotenv'
dotenv.config()


const jsonFormatting = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
)

const log: Logger = winston.createLogger({
    level:      'silly',
    transports: [
        new winston.transports.File({
            filename: `${process.cwd()}/logs/error.log`,
            level:    'error',
            format:   jsonFormatting,
        }),
        new winston.transports.File({
            filename: `${process.cwd()}/logs/debug.log`,
            level:    'info',
            format:   jsonFormatting,
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename:         `${process.cwd()}/logs/exceptions.log`,
            level:            'silly',
            format:           jsonFormatting,
            handleExceptions: true,
        }),
    ],
})

if(process.env.NODE_ENV !== 'production')
{
    // Only write to console if not in production
    log.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
        ),
        level: 'silly',
    }))
}


log.info(`⚡ Running in "${process.env.NODE_ENV}" mode`)

export default log
