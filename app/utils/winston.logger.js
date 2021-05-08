const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('../config');

const loggers = {
    error: 'error',
    warn: 'warn',
    info: 'info',
    http: 'http',
    verbose: 'verbose',
    debug: 'debug',
    silly: 'silly'
}

const logger = {};

/**
 * Create independent levels (info, warn, error, debug).
 */
for (let level of Object.keys(loggers)) {

    let transport = new winston.transports.DailyRotateFile({
        dirname: `${config.logDirectory}`, // folder is created
        filename: `notifications.${loggers[level]}.%DATE%.log.archive`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxFiles: '10', // 10 files maximum.
        createSymlink: true,
        symlinkName: `notifications.${loggers[level]}.log`
    });

    /**
     * Basic configuration.
     * !new winston.transports.File({ filename: `/var/log/node/notifications.${loggers[level]}.log`, level: loggers[level]}),
     * !new winston.transports.File({ filename: '/var/log/node/notifications.combined.log' }),  
     */

    // Set Logger
    loggers[level] = winston.createLogger({
        level: loggers[level],
        format: winston.format.json(),
        transports: [
            transport
        ]         
    });

    // Set Pass through
    logger[level] = (...args) => loggers[level][level](...args);
}

module.exports = {
    logger
}