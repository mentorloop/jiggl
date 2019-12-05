/**
 * jiggl cli
 *
 * run some things automatically.
 * useful for running on a cron.
 *
 * - update toggl groups
 * - get toggl entries for the last week
 * - pull jira issues
 * - pull epics
 */

const {
  connection
} = require('./db');
const {
  updateTogglGroups,
} = require('./lib/toggl');
const {
  lastSevenDays
} = require('./lib/util');
const {
  pullTogglEntries,
  pullJiraIssues,
  pullJiraEpics,
} = require('./lib/methods');


const showtime = async () => {
  // connect to the db
  await connection;

  // sync the toggl groups
  console.log('syncing toggl groups');
  await updateTogglGroups();

  // pull the last week
  console.log('pulling toggl entries');
  await pullTogglEntries(lastSevenDays());

  // pull missing jira issues
  console.log('pulling jira issues');
  await pullJiraIssues();

  // pull missing jira epics
  console.log('pulling jira epics');
  await pullJiraEpics();

  console.log('done :)');
};


showtime();
