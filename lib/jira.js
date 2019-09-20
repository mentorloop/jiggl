const get = require('lodash/get');

const fetch = require('./fetch');
const config = require('./config');
const { getIssueFromCache, saveIssueToCache } = require('./cache');

const { JIRA_API_TOKEN, JIRA_USERNAME, BASE_URL } = config;

const AUTH_TOKEN = Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString(
  'base64',
);

const request = url =>
  fetch(`${BASE_URL}${url}`, {
    headers: {
      Authorization: `Basic ${AUTH_TOKEN}`,
    },
  });

const parseIssue = issue => ({
  key: get(issue, 'key', null),
  type: get(issue, 'fields.issuetype.name', null),
  status: get(issue, 'fields.status.name', null),
  summary: get(issue, 'fields.summary', null),
  assignee: get(issue, 'fields.assignee.name', null),
  parent: get(issue, 'fields.parent.key', null),
  labels: get(issue, 'field.labels', []),
  epic: get(issue, 'fields.customfield_10014'),
  epicTitle: get(issue, 'fields.customfield_10011', null),
});

const getIssueFromServer = key => request(`issue/${key}`).then(parseIssue);

const getIssue = async issueKey => {
  const cached = getIssueFromCache(issueKey);
  if (cached) {
    console.log(`found ${issueKey} in cache`);
    return cached;
  }

  try {
    const remote = await getIssueFromServer(issueKey);
    if (remote) {
      saveIssueToCache(remote);
      return remote;
    }
  } catch (error) {
    console.log('error fetching remote issue');
    console.error(error);
    return null;
  }
};

module.exports = {
  getIssue,
};
