const _ = require('lodash');
const {
  removeTogglEntriesBetween,
  getTogglEntriesWithIssueKey,
  updateTogglEntryIssue,
  flagEntriesWithBadIssueKey,
  createJiraIssue,
  getJiraIssuesWithEpics,
  getJiraIssuesWithParents,
  updateJiraIssueEpic,
  updateJiraIssueParent,
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

  await sequential(issues, async (issue) => {
    if (issue) {
      return createJiraIssue(issue);
    }
    return false;
  });

  await Promise.all(
    issueKeys.map((issueKey, i) => {
      const entryIds = groupedByKey[issueKey].map(entry => entry.id);
      if (issues[i]) {
        return updateTogglEntryIssue(entryIds, issues[i].id);
      }
      return flagEntriesWithBadIssueKey(entryIds);
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

const pullJiraParents = async () => {
  const issues = await getJiraIssuesWithParents();
  const groupedByKey = _.groupBy(issues, i => i.parentKey);
  const parentKeys = Object.keys(groupedByKey);

  const chunkedParentKeys = _.chunk(parentKeys, 10);

  const parents = await sequential(chunkedParentKeys, async keys => Promise.all(keys.map(getIssueFromServer)));

  await sequential(parents, async parent => {
    if (!parent) return false;
    return createJiraIssue(parent);
  });

  await Promise.all(
    parentKeys.map((parentKey, i) => {
      if (parents[i]) {
        const issueIds = groupedByKey[parentKey].map(issue => issue.id);
        return updateJiraIssueParent(issueIds, parents[i].id);
      }
    }),
  );
}


module.exports = {
  pullTogglEntries,
  pullJiraIssues,
  pullJiraEpics,
  pullJiraParents,
};
