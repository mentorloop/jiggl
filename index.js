const inquirer = require('inquirer');
const inquirerDatepicker = require('inquirer-datepicker-prompt');

const {
  getIssuesForItems,
  replaceIssuesWithParents,
  replaceIssuesWithEpics,
} = require('./lib/jira');
const { getSummary, getDetailed } = require('./lib/toggl');
const { editReport } = require('./lib/reports');
const {
  lastBusinessDay,
  lastMonth,
  twoDP,
  useIssueTitles,
  mergeItems,
  compose,
  formatTogglDate,
} = require('./lib/util');
const Doc = require('./lib/doc');

inquirer.registerPrompt('datetime', inquirerDatepicker);

async function getLastMonthSummary() {
  const dates = lastMonth();
  return getSummary(dates);
}

async function getYesterdayDetailed() {
  const yesterday = lastBusinessDay();
  return getDetailed(yesterday);
}

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

async function processSummary(report) {
  const issues = (await getIssuesForItems(report.items)).filter(
    item => item.issueKey,
  );
  const issuesWithParents = compose(mergeItems, useIssueTitles)(await replaceIssuesWithParents(issues));
  const epicIssues = mergeItems(await replaceIssuesWithEpics(issues));

  const projects = await editReport(report.projects);
  const epics = await editReport(epicIssues);
  const features = await editReport(issuesWithParents);

  process.stdout.write('\033c');

  printReport('Toggl Projects', projects, 0);
  printReport('Epic breakdown', epics, 0);
  printReport('Features', features, 10);
}

async function processDetailed(report) {
  // fetch issues
  for (let userSummary of report.items) {
    const itemsWithIssues = await getIssuesForItems(userSummary.items);
    userSummary.items = itemsWithIssues;
  }

  const doc = new Doc();

  const title = `Toggl Summary ${lastBusinessDay().since}`;
  doc.log(title);
  doc.log(underline(title));
  doc.linebreak();
  const usersWithProblems = new Set();
  report.items.forEach(userSummary => {
    const title = `${userSummary.user}: ${userSummary.time}`;
    doc.log(title);
    doc.log(underline(title, '-'));
    useIssueTitles(userSummary.items).forEach(item => {
      const title = item.issue
        ? `[${item.issue.key}] ${item.issue.summary}`
        : `* ${item.title || 'NO DESCRIPTION'}`;
      const { project, time } = item;
      const projectName = project
        ? project.replace(/^Dev - /, '')
        : 'NO PROJECT';
      doc.log(`${title} - ${twoDP(time)} (${projectName})`);
      if (!project || !item.title) {
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
  const report = await getLastMonthSummary();
  return processSummary(report);
}

async function runYesterday() {
  const report = await getYesterdayDetailed();
  return processDetailed(report);
}

async function runSummary() {
  const dates = await promptForDates();
  const report = await getSummary(dates);
  return processSummary(report);
}

async function runDetailed() {
  const dates = await promptForDates();
  const report = await getDetailed(dates);
  return processDetailed(report);
}

const dateQuestion = {
  type: 'datetime',
  name: 'date',
  message: 'Date',
  format: ['yyyy', '-', 'mm', '-', 'dd'],
};

const promptForDates = () =>
  inquirer
    .prompt([
      {
        ...dateQuestion,
        name: 'since',
        message: 'Since',
      },
      {
        ...dateQuestion,
        name: 'until',
        message: 'Until',
      },
    ])
    .then(({ since, until }) => ({
      since: formatTogglDate(since),
      until: formatTogglDate(until),
    }));

inquirer
  .prompt([
    {
      type: 'list',
      choices: ['Yesterday', 'Last Month', 'Summary', 'Detailed'],
      name: 'report',
      message: 'what report do you want to run?',
    },
  ])
  .then(({ report }) => {
    switch (report) {
      case 'Last Month':
        return runLastMonth();
      case 'Yesterday':
        return runYesterday();
      case 'Summary':
        return runSummary();
      case 'Detailed':
        return runDetailed();
      default:
        return;
    }
  });
