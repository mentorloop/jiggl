const winston = require('winston');
const { format } = require('logform');

const config = require('./config');

// replace any of the dangerous config values with their key name
const sanitiseDangerousKeys = (msg = '') => config.__dangerousKeys.reduce((message, key) => typeof message === 'string' ? message.replace(config[key], key) : message, msg);
const sanitiseMessage = format((info) => ({
  ...info,
  message: sanitiseDangerousKeys(info.message),
}));

// simplified CLI logger, set SIMPLE_LOGGING to use.
const simpleLogger = format.printf((data) => {
  const { timestamp, level, message, ...meta} = data;
  const hasMeta = Object.keys(JSON.parse(JSON.stringify(meta))).length;
  return `${timestamp} ${level.toUpperCase()} ${message} ${hasMeta ? JSON.stringify(meta) : ''}`;
});

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

logger.info(`logger initialised with level ${config.LOG_LEVEL}, simpleLogging ${!!config.SIMPLE_LOGGING}`);
module.exports = logger;
