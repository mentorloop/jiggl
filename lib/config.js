require('dotenv').config();

const _ = require('lodash');

const requiredFields = [
  'JIRA_API_TOKEN',
  'JIRA_USERNAME',
  'BASE_URL',
  'TOGGL_API_KEY',
  'TOGGL_WORKSPACE',
  'TOGGL_GROUP',
  'JIRA_DEFAULT_PREFIX',
];

// eslint-disable-next-line no-process-env
const fields = _.pick(process.env, requiredFields);

const missing = _.difference(requiredFields, Object.keys(fields));
if (missing.length) {
  throw new Error(`Missing required config variables ${missing.join(', ')}`);
}

module.exports = fields;
