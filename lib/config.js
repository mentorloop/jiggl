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

const optionalFields = [
  'DB_STORAGE',
  'DB_HOST',
  'DB_PASSWORD',
  'TIMEZONE',
  'DAY_START',
];

// eslint-disable-next-line no-process-env
const fields = _.pick(process.env, requiredFields);
const optional = _.defaults(
  _.pick(process.env, optionalFields),
  {
    DB_STORAGE: null,
    DB_PASSWORD: null,
    DB_HOST: 'localhost',
    TIMEZONE: 'UTC',
    DAY_START: null,
  },
);

const missing = _.difference(requiredFields, Object.keys(fields));
if (missing.length) {
  throw new Error(`Missing required config variables ${missing.join(', ')}`);
}

module.exports = {
  ...fields,
  ...optional,
};
