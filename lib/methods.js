const _ = require('lodash');
const {
  removeTogglEntriesBetween,
  getTogglEntriesWithIssueKey,
  updateTogglEntryIssue,
  createJiraIssue,
  getJiraIssuesWithEpics,
  updateJiraIssueEpic,
} = require('../db');
const {
  getDetailed,
  saveReportItems,
} = require('./toggl');
const {
  dateToUtc,
  sequential,
} = require('./util');
const {
  getIssueFromServer,
} = require('./jira');


// remove and re-fetch toggl entries between a date range
const pullTogglEntries = async (togglDateObject) => {
  const { since, until } = togglDateObject;
  await removeTogglEntriesBetween(dateToUtc(since), dateToUtc(until));
  const report = await getDetailed(togglDateObject);
  return saveReportItems(report);
};


// fetch jira issues for all the togglentries
// that aren't associated with an issue yet.
const pullJiraIssues = async () => {
  // get the issue keys.
  // for each, hit the API
  // create the issue
  // link the togglentry back to the issue

  const entries = await getTogglEntriesWithIssueKey();
  const groupedByKey = _.groupBy(entries, e => e.issueKey);
  const issueKeys = Object.keys(groupedByKey);

  // fetch 10 at a time from the server
  const chunkedIssueKeys = _.chunk(issueKeys, 10);

  const issues = await sequential(chunkedIssueKeys, async keys => {
    return Promise.all(keys.map(getIssueFromServer));
  });

  await sequential(issues, async issue => {
    // todo - what should we do here?
    // server fetch doesn't always work.
    // do we log it? or put an error on the parent?
    if (!issue) return false;

    return createJiraIssue(issue);
  });

  await Promise.all(
    issueKeys.map((issueKey, i) => {
      if (issues[i]) {
        const entryIds = groupedByKey[issueKey].map(entry => entry.id);
        return updateTogglEntryIssue(entryIds, issues[i].id);
      }
    }),
  );
}

const pullJiraEpics = async () => {
  const issues = await getJiraIssuesWithEpics();
  const groupedByKey = _.groupBy(issues, i => i.epicKey);
  const epicKeys = Object.keys(groupedByKey);

  const chunkedEpicKeys = _.chunk(epicKeys, 10);

  const epics = await sequential(chunkedEpicKeys, async keys => {
    return Promise.all(keys.map(getIssueFromServer));
  });

  await sequential(epics, async epic => {
    // todo - what to do here? see above in pullJiraIssues()
    if (!epic) return false;

    return createJiraIssue(epic);
  });

  await Promise.all(
    epicKeys.map((epicKey, i) => {
      if (epics[i]) {
        const issueIds = groupedByKey[epicKey].map(issue => issue.id);
        return updateJiraIssueEpic(issueIds, epics[i].id);
      }
    }),
  );
};

module.exports = {
  pullTogglEntries,
  pullJiraIssues,
  pullJiraEpics,
};
