
import winston, { Logger } from 'winston'
import dotenv from 'dotenv'
dotenv.config()


const jsonFormatting = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
)

const logger: Logger = winston.createLogger({
    level:      'silly',
    transports: [
        new winston.transports.File({
            filename: 'logs/error.log',
            level:    'error',
            format:   jsonFormatting,
        }),
        new winston.transports.File({
            filename: 'logs/debug.log',
            level:    'info',
            format:   jsonFormatting,
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename:         'logs/exceptions.log',
            level:            'silly',
            format:           jsonFormatting,
            handleExceptions: true,
        }),
    ],
})

if(process.env.NODE_ENV !== 'production')
{
    // Only write to console if not in production
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
        ),
        level: 'silly',
    }))
}


logger.info(`⚡ Running in "${process.env.NODE_ENV}" mode`)

export default logger
