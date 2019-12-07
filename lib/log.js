const winston = require('winston');
const { format } = require('logform');

const config = require('./config');

// replace any of the dangerous config values with their key name
const sanitiseDangerousKeys = (msg = '') => config.__dangerousKeys.reduce((message, key) => message.replace(config[key], key), msg);
const sanitiseMessage = format((info) => ({
  ...info,
  message: sanitiseDangerousKeys(info.message),
}));


// simplified CLI logger, set SIMPLE_LOGGING to use.
const simpleLogger = format.printf((info) => `${info.timestamp} ${info.level.toUpperCase()} ${info.message}`);

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: config.LOG_LEVEL,
      format: format.combine(
        format.timestamp(),
        sanitiseMessage(),
        config.SIMPLE_LOGGING ? simpleLogger : format.json(),
      ),
    }),
  ],
});

logger.info(`logger initialised with level ${config.LOG_LEVEL}`);

module.exports = logger;
