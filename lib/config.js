require('dotenv').config();

const _ = require('lodash');

const requiredFields = [
  'JIRA_API_TOKEN',
  'JIRA_USERNAME',
  'BASE_URL',
  'TOGGL_API_KEY',
  'TOGGL_WORKSPACE',
  'DB_DATABASE',
  'DB_USERNAME',
  'DB_DIALECT',
];

const optionalWithDefaults = {
  DB_HOST: 'localhost',
  DB_STORAGE: null,
  DB_PASSWORD: null,
  TIMEZONE: 'UTC',
  DAY_START: null,
  LOG_LEVEL: 'info',
  SIMPLE_LOGGING: false,
};

// keys that we don't want to accidentally log the value of.
// see lib/log.js
const dangerousKeys = [
  'JIRA_API_TOKEN',
  'JIRA_USERNAME',
  'TOGGL_API_KEY',
  'DB_USERNAME',
  'DB_PASSWORD',
];

// eslint-disable-next-line no-process-env
const required = _.pick(process.env, requiredFields);
const missingRequired = _.difference(requiredFields, Object.keys(required));
if (missingRequired.length) {
  throw new Error(`Missing required config variables ${missingRequired.join(', ')}`);
}

const optional = _.defaults(
  _.pick(process.env, Object.keys(optionalWithDefaults)),
  optionalWithDefaults,
);

const config = {
  ...required,
  ...optional,
};

module.exports = {
  ...config,
  __dangerousKeys: dangerousKeys.filter(key => !!config[key]),
}
