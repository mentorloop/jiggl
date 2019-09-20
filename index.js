const { getIssue } = require('./lib/jira');
const { getSummary, groupAndSumItems } = require('./lib/toggl');

async function getAugustSummary() {
  return getSummary({
    since: '2019-08-01',
    until: '2019-08-31',
  });
}

async function getParentIssues(issues) {
  // if an issue has a parent, grab that too.
  const parentIssues = await Promise.all(
    issues.map(issue => {
      if (!issue.issue.parent) {
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

  // now re-group and sum again
  return groupAndSumItems(parentIssues);
}

// group items by epics
async function getEpics(issues) {
  const epics = await Promise.all(
    issues.map(issue => {
      if (!issue.issue.epic) {
        return Promise.resolve(issue);
      }
      console.log(
        `Pulling epic ${issue.issue.epic} for issue ${issue.issue.key}`,
      );
      return getIssue(issue.issue.epic).then(epic => ({
        title: epic.key,
        time: issue.time,
        issueKey: epic.key,
        issue: epic,
      }));
    }),
  );

  return groupAndSumItems(epics.filter(issue => issue.issue.type === 'Epic'));
}

const cleanIssue = issue => ({
  title: `${issue.issueKey}: ${issue.issue.epicTitle || issue.issue.summary}`,
  time: issue.time,
});

async function boot() {
  const report = await getAugustSummary();

  // pull the time entries that we could find issueKeys for,
  // and fetch them from the server
  const itemsWithKeys = report.items.filter(item => item.issueKey);

  // todo - do this sequentially if we start hitting rate limits
  const issues = await Promise.all(
    itemsWithKeys.map(item =>
      getIssue(item.issueKey).then(issue => ({
        ...item,
        issue,
      })),
    ),
  );

  const parents = await getParentIssues(issues);
  const epics = await getEpics(issues);

  console.log(parents.slice(0, 10).map(cleanIssue));
  console.log(epics.map(cleanIssue));
  console.log(report.total);
  console.log(report.projects);
}

boot();
