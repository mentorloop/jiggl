const _ = require('lodash');

const fetch = require('./fetch');
const log = require('./log');
const config = require('./config');
const {
  twoDP,
  mergeItems,
  sortItemsByTime,
  calculatePercentages,
  sequential,
} = require('./util');
const { models } = require('../db');
const {
  ignoreUniqueErrors,
  definedFieldsOnly,
  getModelFields,
  getModel,
} = require('../db/util');

const { TOGGL_API_KEY, TOGGL_WORKSPACE } = config;

const { TogglEntry, TogglGroup, TogglUser, TogglProject } = models;

const DEFAULT_PARAMS = {
  user_agent: 'jiggl',
  workspace_id: TOGGL_WORKSPACE,
};

const optionsToParams = options => {
  const withDefaults = {
    ...DEFAULT_PARAMS,
    ...options,
  };

  const paramString = Object.keys(withDefaults)
    .map(key => `${key}=${withDefaults[key]}`)
    .join('&');

  return paramString ? `?${paramString}` : '';
};

const msToHours = ms => twoDP(ms / 1000 / 60 / 60);

const getReportBaseUrl = (reportType, options = {}) =>
  `https://${TOGGL_API_KEY}:api_token@api.track.toggl.com/reports/api/v2/${reportType}/${optionsToParams(
    options,
  )}`;

const getWorkspaceBaseUrl = endpoint =>
  `https://${TOGGL_API_KEY}:api_token@api.track.toggl.com/api/v8/workspaces/${TOGGL_WORKSPACE}/${endpoint}`;

const getTogglReport = (reportType, options) =>
  fetch(getReportBaseUrl(reportType, options));

// fetch a detailed report
// calls itself recursively to handle pagination
const getTogglDetailedReport = async (opts, acc = { data: [] }, page = 1) => {
  const report = await getTogglReport('details', {
    ...opts,
    page,
  });

  const merged = {
    ...acc,
    data: [...acc.data, ...report.data],
  };

  const numPages = Math.ceil(report.total_count / report.per_page);

  if (page >= numPages) return merged;

  return getTogglDetailedReport(opts, merged, ++page);
};

const getGroups = () => fetch(getWorkspaceBaseUrl('groups'));

const getUsers = () => fetch(getWorkspaceBaseUrl('users'));

const getWorkspaceUsers = () => fetch(getWorkspaceBaseUrl('workspace_users'));

const jiraProjectRegex = /^([a-z]+)-(\d+)/i;

const parseIssueKey = str => {
  const match = str.match(jiraProjectRegex);
  return match ? match[0] : null;
};

/**
 * Save the contents of a detailed report into the database.
 * - TogglUsers
 * - TogglProjects
 * - TogglEntry
 * @param  {[type]} report [description]
 * @return {[type]}        [description]
 */
const saveReportItems = report => {
  return sequential(report.data, async item => {
    log.debug('TogglUser.findOrCreate', { id: item.uid });
    await TogglUser.findOrCreate({
      where: {
        id: item.uid,
      },
      defaults: {
        user: item.user,
      },
    });
    if (item.pid) {
      log.debug('TogglProject.findOrCreate', { id: item.pid });
      await TogglProject.findOrCreate({
        where: {
          id: item.pid,
        },
        defaults: {
          project: item.project,
        },
      });
    }

    // if it already exists, remove it first.
    log.debug('TogglEntry.destroy', { id: item.id });
    const destroyResult = await TogglEntry.destroy({
      where: {
        id: item.id,
      },
    });
    log.debug(destroyResult);

    log.debug('TogglEntry.create', item);
    await TogglEntry.create(
      {
        ...item,
        issueKey: parseIssueKey(item.description),
        hours: msToHours(item.dur),
      },
      {
        fields: getModelFields(TogglEntry),
      },
    ).catch(ignoreUniqueErrors);
  });
};

// update the toggl groups and users
const updateTogglGroups = async () => {
  const groups = await getGroups();
  const groupModels = await Promise.all(
    groups.map(group =>
      TogglGroup.findOrCreate({
        where: {
          id: group.id,
        },
        defaults: definedFieldsOnly(group, TogglGroup),
      }).then(getModel),
    ),
  );

  // right now we only care about active users.
  const users = await getWorkspaceUsers().then(workspaceUsers =>
    workspaceUsers.filter(user => user.active && !user.inactive),
  );
  const userModels = await Promise.all(
    users.map(user => {
      const { uid: id, name } = user;
      return TogglUser.findOrCreate({
        where: {
          id,
        },
        defaults: {
          user: name,
        },
      }).then(getModel);
    }),
  );

  users.forEach((user, i) => {
    userModels[i].setGroups(
      groupModels.filter(model => user.group_ids.includes(model.get().id)),
    );
  });

  console.table(groups);
};

module.exports = {
  getTogglDetailedReport,
  saveReportItems,
  getGroups,
  getUsers,
  getWorkspaceUsers,
  updateTogglGroups,
};
