const _ = require('lodash');
const inquirer = require('inquirer');
const inquirerDatepicker = require('inquirer-datepicker-prompt');
const subDays = require('date-fns/subDays');

const {
  DAILY_TIMESTAMP
} = require('./lib/config');
const {
  getIssuesForItems,
  getIssueFromServer,
  replaceIssuesWithParents,
  replaceIssuesWithEpics,
} = require('./lib/jira');
const {
  getSummary,
  getDetailed,
  parseDetailedReport,
  saveReportItems,
  parseEntriesForDetailed,
} = require('./lib/toggl');
const { editReport } = require('./lib/reports');
const {
  lastMonth,
  twoDP,
  useIssueTitles,
  mergeItems,
  compose,
  formatTogglDate,
  sequential,
} = require('./lib/util');
const Doc = require('./lib/doc');
const {
  createJiraIssue,
  getTogglEntriesWithIssueKey,
  getTogglEntriesBetween,
  getJiraIssuesWithEpics,
  updateTogglEntryIssue,
  updateJiraIssueEpic,
  forceSyncDB,
} = require('./db');

inquirer.registerPrompt('datetime', inquirerDatepicker);

const cleanItems = items =>
  items.map(({ title, time, percent }) => ({
    title,
    time,
    percent,
  }));

const underline = (str, char = '=') => str.replace(/./g, char);

const printReport = (title, report, numItems = 10) => {
  console.log(title);
  console.log(underline(title));
  console.log(`Showing first ${numItems} of ${report.length}`);
  console.log(cleanItems(report).slice(0, numItems || undefined));
  console.log('\n\n\n');
};

async function processSummary(report, opts) {
  const issues = (await getIssuesForItems(report.items)).filter(
    item => item.issueKey,
  );
  const issuesWithParents = compose(
    mergeItems,
    useIssueTitles,
  )(await replaceIssuesWithParents(issues));
  const epicIssues = mergeItems(await replaceIssuesWithEpics(issues));

  const projects = await editReport(report.projects);
  const epics = await editReport(epicIssues);
  const features = await editReport(issuesWithParents);

  process.stdout.write('\033c');

  const dateRange =
    opts.since === opts.until ? opts.since : `${opts.since} - ${opts.until}`;
  const title = `Toggl Summary ${dateRange}`;
  console.log(title);
  console.log('\n\n');

  printReport('Toggl Projects', projects, 0);
  printReport('Epic breakdown', epics, 0);
  printReport('Features', features, 10);
}

async function processDetailed(entries, opts) {
  const doc = new Doc();

  const dateRange =
    opts.since === opts.until ? opts.since : `${opts.since} - ${opts.until}`;
  const title = `Toggl Summary ${dateRange}`;

  doc.log(title);
  doc.log(underline(title));
  doc.linebreak();
  const usersWithProblems = new Set();
  entries.forEach(userSummary => {
    const title = `${userSummary.user}: ${userSummary.total}`;
    doc.log(title);
    doc.log(underline(title, '-'));
    useIssueTitles(userSummary.entries).forEach(entry => {
      const title = entry.jiraissue
        ? `[${entry.jiraissue.key}] ${entry.jiraissue.summary}`
        : `* ${entry.description || 'NO DESCRIPTION'}`;
      const { project, hours } = entry;
      const projectName = project
        ? project.replace(/^Dev - /, '')
        : 'NO PROJECT';
      doc.log(`${title} - ${twoDP(hours)} (${projectName})`);
      if (!project || !entry.description) {
        usersWithProblems.add(userSummary.user);
      }
    });
    doc.linebreak();
  });
  if (usersWithProblems.size) {
    doc.linebreak();
    doc.log('Entries needing fixing');
    doc.log(underline('Entries needing fixing'));
    doc.log(
      `${Array.from(usersWithProblems).join(' & ')} ${
        usersWithProblems.size === 1 ? 'has' : 'have'
      } entries with no description or project`,
    );
  }

  doc.print();
}

async function runLastMonth() {
  const dates = lastMonth();
  const report = await getSummary(dates);
  return processSummary(report, dates);
}

async function runDaily() {
  const { date: day } = await promptForDates(['date']);
  const dateString = `${day}T${DAILY_TIMESTAMP}`;
  const date = new Date(dateString);
  const dayBeforeDate = subDays(date, 1);
  const entries = await getTogglEntriesBetween(dayBeforeDate, date);

  const parsed = parseEntriesForDetailed(entries);

  return processDetailed(parsed, {
    since: day,
    until: day,
  });
}

async function pullTogglEntries() {
  const dates = await promptForDates();
  const report = await getDetailed(dates);
  return saveReportItems(report);
}

async function runSummary() {
  const dates = await promptForDates();
  const report = await getSummary(dates);
  return processSummary(report, dates);
}

async function runDetailed() {
  const dates = await promptForDates();
  const report = await getDetailed(dates).then(parseDetailedReport);
  return processDetailed(report, dates);
}

// fetch jira issues for all the togglentries
// that aren't associated with an issue yet.
async function pullJiraIssues() {
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

async function pullJiraEpics() {
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
}

const dateQuestion = {
  type: 'datetime',
  name: 'date',
  message: 'Date',
  format: ['yyyy', '-', 'mm', '-', 'dd'],
};

const promptForDates = (names = ['since', 'until']) =>
  inquirer
    .prompt(
      names.map(name => ({
        ...dateQuestion,
        name,
        message: name,
      })),
    )
    .then(dates =>
      names.reduce(
        (acc, date) => ({
          ...acc,
          [date]: formatTogglDate(dates[date]),
        }),
        {},
      ),
    );

inquirer
  .prompt([
    {
      type: 'list',
      choices: [
        'Pull Toggl Entries',
        'Pull Jira Issues',
        'Pull Epics',
        'Pull Toggl Groups',
        'Daily',
        'Last Month',
        'Summary',
        'Detailed',
        'Force-Sync DB',
      ],
      name: 'report',
      message: 'what report do you want to run?',
    },
  ])
  .then(({ report }) => {
    switch (report) {
      case 'Pull Toggl Entries':
        return pullTogglEntries();
      case 'Pull Jira Issues':
        return pullJiraIssues();
      case 'Pull Epics':
        return pullJiraEpics();
      case 'Pull Toggl Groups':
        return pullTogglGroups();
      case 'Daily':
        return runDaily();
      case 'Last Month':
        return runLastMonth();
      case 'Summary':
        return runSummary();
      case 'Detailed':
        return runDetailed();
      case 'Force-Sync DB':
        return forceSyncDB();
      default:
        return;
    }
  });
