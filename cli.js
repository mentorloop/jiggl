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
  lastXDays,
} = require('./lib/util');
const {
  pullTogglEntries,
  pullJiraIssues,
  pullJiraEpics,
  pullJiraParents,
  updatePropertiesFromParentsAndEpics,
} = require('./lib/methods');
const log = require('./lib/log');


const showtime = async () => {
  // connect to the db
  await connection;

  // sync the toggl groups
  log.info('syncing toggl groups');
  await updateTogglGroups();

  // pull the last week
  log.info('pulling toggl entries');
  await pullTogglEntries(lastXDays(7));

  // pull missing jira issues
  log.info('pulling jira issues');
  await pullJiraIssues();

  // pull missing jira epics
  log.info('pulling jira epics');
  await pullJiraEpics();

  // pull missing parents
  log.info('pulling jira parents');
  await pullJiraParents();

  log.info('updating issues from parents & epics');
  await updatePropertiesFromParentsAndEpics();

  log.info('done :)');
};


showtime();
