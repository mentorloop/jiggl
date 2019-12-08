const get = require('lodash/get');
const pick = require('lodash/pick');

const fetch = require('./fetch');
const config = require('./config');
const { getIssueFromCache, saveIssueToCache } = require('./cache');
const log = require('./log');

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
  ...(pick(issue, ['id', 'key'])),
  ...(pick(issue.fields, ['created', 'updated', 'summary'])),
  issueType: pick(issue.fields.issuetype, ['id', 'description', 'name', 'subtask']),
  issueTypeId: issue.fields.issuetype.id,
  project: pick(issue.fields.project, ['id', 'key']),
  projectId: issue.fields.project.id,
  impact: issue.fields.customfield_10044 ? pick(issue.fields.customfield_10044, ['id', 'value']) : null,
  impactId: get(issue, 'fields.customfield_10044.id', null),
  components: issue.fields.components.map((c => pick(c, ['id', 'name']))),
  drivers: (issue.fields.customfield_10046 || []).map(d => pick(d, ['id', 'value'])),
  productLabels: issue.fields.customfield_10047 || [],
  clients: issue.fields.customfield_10048 || [],
  userTypes: (issue.fields.customfield_10045 || []).map(u => pick(u, ['id', 'value'])),
  epicKey: issue.fields.customfield_10014 || null,
});

const getIssueFromServer = key => request(`issue/${key}`)
  .then(parseIssue)
  .catch((error) => {
    if (error.message === '404') {
      log.error(`Jira issue ${key} does not exist on the server`);
    } else {
      log.error(`Error fetching Jira issue ${key}: ${error.toString()}`);
    }
    return null;
  });

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

// iterate an items array and attach a Jira issue
// for each one with an .issueKey
const getIssuesForItems = items =>
  Promise.all(
    items.map(item => {
      if (item.issueKey) {
        return getIssue(item.issueKey).then(issue => ({
          ...item,
          issueKey: issue.key,
          issue,
        }));
      } else {
        return Promise.resolve(item);
      }
    }),
  );

async function replaceIssuesWithParents(issues) {
  // if an issue has a parent, grab that too.
  return Promise.all(
    issues.map(issue => {
      if (!issue.issue || !issue.issue.parent) {
        return Promise.resolve(issue);
      }
      console.log(
        `Replacing ${issue.issue.key} with parent ${issue.issue.parent}`,
      );
      return getIssue(issue.issue.parent).then(parent => ({
        title: parent.key,
        time: issue.time,
        issueKey: parent.key,
        issue: parent,
      }));
    }),
  );

}

// group items by epics
async function replaceIssuesWithEpics(issues) {
  return Promise.all(
    issues.map(issue => {
      if (!issue.issue.epic) {
        return Promise.resolve({
          ...issue,
          title: 'No Epic',
          issueKey: null,
        });
      }
      console.log(
        `Pulling epic ${issue.issue.epic} for issue ${issue.issue.key}`,
      );
      return getIssue(issue.issue.epic).then(epic => ({
        title: epic.summary,
        time: issue.time,
        issueKey: epic.key,
        issue: epic,
      }));
    }),
  );
}

module.exports = {
  getIssue,
  parseIssue,
  getIssueFromServer,
  getIssuesForItems,
  replaceIssuesWithParents,
  replaceIssuesWithEpics,
};
