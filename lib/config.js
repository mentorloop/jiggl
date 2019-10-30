require('dotenv').config();

const _ = require('lodash');

const requiredFields = [
  'JIRA_API_TOKEN',
  'JIRA_USERNAME',
  'JIRA_PROJECT_PREFIXES',
  'BASE_URL',
  'TOGGL_API_KEY',
  'TOGGL_WORKSPACE',
  'TOGGL_GROUP',
];

// eslint-disable-next-line no-process-env
const fields = _.pick(process.env, requiredFields);

const missing = _.difference(requiredFields, Object.keys(fields));
if (missing.length) {
  throw new Error(`Missing required config variables ${missing.join(', ')}`);
}

module.exports = fields;
