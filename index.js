const inquirer = require('inquirer');
const inquirerDatepicker = require('inquirer-datepicker-prompt');
const { addDays, addBusinessDays } = require('date-fns');
const minimist = require('minimist');

const {
  updateTogglGroups,
} = require('./lib/toggl');
const {
  getIssueFromServer,
} = require('./lib/jira');
const {
  printTogglReport,
  slackTogglReport,
} = require('./lib/reports');
const {
  dateToTogglDate,
  togglDateToDate,
} = require('./lib/util');
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
const argv = minimist(process.argv.slice(2));

const getGroupUserIds = (id) => models.TogglGroup.findOne({
  where: {
    id,
  },
  include: ['users']
}).then(group => {
  if (!group) {
    throw new Error(`No Toggl group with ID ${id}`);
  }
  return group.users.map(user => user.get('id'));
});


// print a report of toggl entries between startDate and endDate,
// optionally filtering to a specific group of users.
const runTogglReport = async (startDate, endDate, group = null) => {
  group = group || await promptForTogglGroup();
  const uids = group ? await getGroupUserIds(group) : null;
  const entries = await getTogglEntriesBetween(startDate, endDate, uids);

  const printer = argv.output === 'slack' ? slackTogglReport : printTogglReport;
  return printer(entries, {
    since: dateToTogglDate(startDate),
    until: dateToTogglDate(endDate),
  });
};


// run a daily toggl report
async function runDaily() {
  const { date: day } = await promptForDates(['date']);
  const startOfDay = togglDateToDate(day);
  const endOfDay = addDays(startOfDay, 1);
  const { group } = await promptForTogglGroup();
  return runTogglReport(startOfDay, endOfDay, group);
}

// run a daily toggl report for the last business day
async function runLastDaily() {
  const now = new Date();
  const lastBusinessDay = dateToTogglDate(addBusinessDays(now, -1));
  const startOfLastBusinessDay = togglDateToDate(lastBusinessDay);
  const endOfLastBusinessDay = addDays(startOfLastBusinessDay, 1);
  const group = argv.group || (await promptForTogglGroup()).group;
  return runTogglReport(startOfLastBusinessDay, endOfLastBusinessDay, group);
}


/**
 * Prompt for a date range, then fetch-and-save toggl
 * entries within the range.
 */
async function pullTogglEntriesForDates() {
  const dates = await promptForDates();
  return pullTogglEntries(dates);
}

/**
 * Fetch and print a jira issue by its issue key
 */
async function getSingleJiraIssue() {
  inquirer.prompt([{
    name: 'key',
    message: 'Issue Key',
  }])
  .then(({ key }) => getIssueFromServer(key))
  .then(console.log);
}

/**
 * Re-fetch a jira issue by its key and save to the DB
 */
async function updateSingleJiraIssue() {
  inquirer.prompt([{
    name: 'key',
    message: 'Issue Key',
  }])
  .then(({ key }) => getIssueFromServer(key))
  .then(createJiraIssue);
}


const dateQuestion = {
  type: 'datetime',
  name: 'date',
  message: 'Date',
  format: ['yyyy', '-', 'mm', '-', 'dd'],
};

/**
 * Prompt the user to enter one or more dates,
 * returned in the toggl date format.
 * @param  {[String]}  names
 * @return {Object} 1x key per value from names param
 */
const promptForDates = (names = ['since', 'until']) =>
  inquirer.prompt(
    names.map(name => ({
      ...dateQuestion,
      name,
      message: name,
    }))
  ).then(responses =>
      names.reduce(
        (acc, date) => ({
          ...acc,
          [date]: dateToTogglDate(responses[date]),
        }),
        {},
      ),
    );

/**
 * Prompt the user to select a Toggl Group.
 * @return {[type]} [description]
 */
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



const commands = {
  'Last Business Day': runLastDaily,
  'Daily report': runDaily,
  'Fetch Toggl Entries': pullTogglEntriesForDates,
  'Sync Jira Issues': pullJiraIssues,
  'Sync Epics': pullJiraEpics,
  'Sync Toggl Groups': updateTogglGroups,
  'Print single Jira issue': getSingleJiraIssue,
  'Update single Jira issue': updateSingleJiraIssue,
  'Update all issues from parents/epics': updatePropertiesFromParentsAndEpics,
  'Force-Sync DB': forceSyncDB,
};

const shortCommands = {
  lastdaily:  runLastDaily,
  daily: runDaily,
};


const promptForCommand = () =>
  inquirer
    .prompt([
      {
        type: 'list',
        choices: Object.keys(commands),
        name: 'action',
        message: 'What would you like to do?',
      },
    ])
    .then(({ action }) => action);

const begin = async () => {
  await connection;
  const command = argv._[0] || await promptForCommand();
  const callback = commands[command] || shortCommands[command] || (() => console.log(`Unknown command: ${command}`));
  callback();
}

begin();

