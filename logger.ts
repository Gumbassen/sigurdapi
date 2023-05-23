
import winston, { Logger } from 'winston'
import dotenv from 'dotenv'
dotenv.config()


const transports = {
    console: new winston.transports.Console({
        format: winston.format.simple(),
        level:  'silly',
    }),
    errorFile: new winston.transports.File({
        filename: 'logs/error.log',
        level:    'error',
        format:   winston.format.json(),
    }),
    debugFile: new winston.transports.File({
        filename: 'logs/debug.log',
        level:    'info',
        format:   winston.format.json(),
    }),
}

const logger: Logger = winston.createLogger({
    level:      'silly',
    transports: [ transports.errorFile, transports.debugFile ],
})

if(process.env.NODE_ENV !== 'production')
{
    // Only write to console if not in production
    logger.add(transports.console)
}


logger.info(`⚡ Running in "${process.env.NODE_ENV}" mode`)

export default logger
