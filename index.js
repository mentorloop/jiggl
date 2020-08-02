const inquirer = require('inquirer');
const inquirerDatepicker = require('inquirer-datepicker-prompt');
const { addDays } = require('date-fns');

const {
  DAY_START
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
  parseEntriesForDetailed,
  updateTogglGroups,
} = require('./lib/toggl');
const { editReport } = require('./lib/reports');
const {
  lastMonth,
  twoDP,
  useIssueTitles,
  mergeItems,
  compose,
  formatTogglDate,
  dateToUtc,
} = require('./lib/util');
const Doc = require('./lib/doc');
const {
  connection,
  models,
  getTogglEntriesBetween,
  forceSyncDB,
  createJiraIssue,
} = require('./db');

const {
  pullTogglEntries,
  pullJiraIssues,
  pullJiraEpics,
  updatePropertiesFromParentsAndEpics,
} = require('./lib/methods');

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

const getGroupUids = (id) => models.TogglGroup.findOne({
  where: {
    id,
  },
  include: ['users']
}).then(group => group.users.map(user => user.get('id')));

async function runDaily() {
  // date is config.DAY_START in config.TIMEZONE
  const { date: day } = await promptForDates(['date']);
  const startOfDay = dateToUtc(`${day}T${DAY_START}`);
  const endOfDay = addDays(startOfDay, 1);
  const { group } = await promptForTogglGroup();
  const uids = group ? await getGroupUids(group) : null;
  const entries = await getTogglEntriesBetween(startOfDay, endOfDay, uids);

  const parsed = parseEntriesForDetailed(entries);

  return processDetailed(parsed, {
    since: day,
    until: day,
  });
}


// prompt for a date range and pull toggl entries
async function pullTogglEntriesForDates() {
  const dates = await promptForDates();
  return pullTogglEntries(dates);
}

async function getSingleJiraIssue() {
  inquirer.prompt([{
    name: 'key',
    message: 'Issue Key',
  }])
  .then(({ key }) => getIssueFromServer(key))
  .then(console.log);
}

async function updateSingleJiraIssue() {
  inquirer.prompt([{
    name: 'key',
    message: 'Issue Key',
  }])
  .then(({ key }) => getIssueFromServer(key))
  .then(createJiraIssue);
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

const promptForTogglGroup = () =>
  models.TogglGroup.findAll()
  .then((groups) => inquirer.prompt([
    {
      name: 'group',
      type: 'list',
      choices: [{
          name: 'none',
          value: null,
        }].concat(groups.map(({ name, id }) => ({
          name,
          value: id,
        }))),
      message: 'filter by toggl group?',
    }]));



const begin = async () => {
  await connection;
  inquirer
    .prompt([
      {
        type: 'list',
        choices: [
          'Daily',
          'Pull Toggl Entries',
          'Pull Jira Issues',
          'Pull Epics',
          'Pull Toggl Groups',
          'Pull Single Jira Issue',
          'Last Month',
          'Summary',
          'Detailed',
          'Force-Sync DB',
          'Update issue',
          'Update from parents and epics',
        ],
        name: 'report',
        message: 'what report do you want to run?',
      },
    ])
    .then(({ report }) => {
      switch (report) {
        case 'Pull Toggl Entries':
          return pullTogglEntriesForDates();
        case 'Pull Jira Issues':
          return pullJiraIssues();
        case 'Pull Epics':
          return pullJiraEpics();
        case 'Pull Toggl Groups':
          return updateTogglGroups();
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
        case 'Pull Single Jira Issue':
          return getSingleJiraIssue();
        case 'Update issue':
          return updateSingleJiraIssue();
        case 'Update from parents and epics':
          return updatePropertiesFromParentsAndEpics();
        default:
          return;
      }
    });
}

begin();

