const inquirer = require('inquirer');
const inquirerDatepicker = require('inquirer-datepicker-prompt');
const { addDays, addBusinessDays, format } = require('date-fns');

const {
  DAY_START
} = require('./lib/config');
const {
  updateTogglGroups,
} = require('./lib/toggl');
const {
  getIssueFromServer,
} = require('./lib/jira');
const {
  printTogglReport,
} = require('./lib/reports');
const {
  formatTogglDate,
  dateToUtc,
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


const getGroupUserIds = (id) => models.TogglGroup.findOne({
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
  const uids = group ? await getGroupUserIds(group) : null;
  const entries = await getTogglEntriesBetween(startOfDay, endOfDay, uids);
  return printTogglReport(entries, {
    since: day,
    until: day,
  });
}

async function runLastDaily() {
  const now = new Date();
  const lastBusinessDay = addBusinessDays(now, -1);
  const startOfLastBusinessDay = dateToUtc(`${format(lastBusinessDay, 'yyyy-MM-dd')}T${DAY_START}`);
  const endOfLastBusinessDay = addDays(startOfLastBusinessDay, 1);
  const { group } = await promptForTogglGroup();

  const uids = group ? await getGroupUserIds(group) : null;

  const entries = await getTogglEntriesBetween(startOfLastBusinessDay, endOfLastBusinessDay, uids);

  return printTogglReport(entries, {
    since: now,
    until: now,
  });
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
 * Use inquirer to prompt a user for a date range.
 * Pass an array of names to prompt the user for,
 * defaults to 'since' and 'until.'
 * @param  {Array}  names
 * @return {Object} has keys matching names parameter
 */
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



const thingsToDo = {
  'Last Day': runLastDaily,
  'Daily': runDaily,
  'Fetch Toggl Entries': pullTogglEntriesForDates,
  'Pull Jira Issues': pullJiraIssues,
  'Pull Epics': pullJiraEpics,
  'Pull Toggl Groups': updateTogglGroups,
  'Force-Sync DB': forceSyncDB,
  'Pull Single Jira Issue': getSingleJiraIssue,
  'Update issue': updateSingleJiraIssue,
  'Update from parents and epics': updatePropertiesFromParentsAndEpics,
};


const begin = async () => {
  await connection;
  inquirer
    .prompt([
      {
        type: 'list',
        choices: Object.keys(thingsToDo),
        name: 'report',
        message: 'what report do you want to run?',
      },
    ])
    .then(({ report }) => {
      const callback = thingsToDo[report] || (() => {});
      return callback();
    });
}

begin();

