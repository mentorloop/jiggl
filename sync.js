/**
 * jiggl/sync
 *
 * sync the remote data sources with our local DB.
 * useful to run as a cronjob.
 *
 * - sync toggl groups and users
 * - sync toggl entries for the last 7 days
 * - sync jira issues, parents and epics
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

  // pull the last week of toggl entries
  log.info('pulling toggl entries');
  await pullTogglEntries(lastXDays(7));

  // sync missing jira issues
  log.info('pulling jira issues');
  await pullJiraIssues();

  // sync missing jira epics
  log.info('pulling jira epics');
  await pullJiraEpics();

  // sync missing parents
  log.info('pulling jira parents');
  await pullJiraParents();

  log.info('updating issues from parents & epics');
  await updatePropertiesFromParentsAndEpics();

  log.info('done :)');
};


showtime();
