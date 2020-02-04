const _ = require('lodash');

const fetch = require('./fetch');
const log = require('./log');
const config = require('./config');
const {
  twoDP,
  useIssueTitles,
  mergeItems,
  mergeEntries,
  sortItemsByTime,
  calculatePercentages,
  sequential
} = require('./util');
const {
  models
} = require('../db');
const {
  ignoreUniqueErrors,
  definedFieldsOnly,
  getModelFields,
  getModel,
} = require('../db/util');

const {
  TOGGL_API_KEY,
  TOGGL_WORKSPACE,
} = config;

const {
  TogglEntry,
  TogglGroup,
  TogglUser,
  TogglProject,
} = models;


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
  `https://${TOGGL_API_KEY}:api_token@toggl.com/reports/api/v2/${reportType}/${optionsToParams(
    options,
  )}`;

const getWorkspaceBaseUrl = (endpoint) =>
`https://${TOGGL_API_KEY}:api_token@toggl.com/api/v8/workspaces/${TOGGL_WORKSPACE}/${endpoint}`


const getReport = (reportType, options) =>
  fetch(getReportBaseUrl(reportType, options));

const getSummary = opts => getReport('summary', {
  ...opts,
  grouping: 'projects',
  subgrouping: 'time_entries',
}).then(parseSummaryReport);


// fetch a detailed report
// calls itself recursively to handle pagination
const getDetailed = async (opts, acc = { data: [] }, page = 1) => {
  const report = await getReport('details', {
    ...opts,
    page,
  });

  const merged = {
    ...acc,
    data: [...acc.data, ...report.data],
  };

  const numPages = Math.ceil(report.total_count / report.per_page);

  if (page >= numPages) return merged;

  return getDetailed(opts, merged, ++page);
};

const getGroups = () =>
  fetch(getWorkspaceBaseUrl('groups'));

const getUsers = () =>
  fetch(getWorkspaceBaseUrl('users'));

const getWorkspaceUsers = () =>
fetch(getWorkspaceBaseUrl('workspace_users'));



const jiraProjectRegex = /^([a-z]+)-(\d+)/i;

const parseIssueKey = str => {
  const match = str.match(jiraProjectRegex);
  return match ? match[0] : null;
};

const parseDetailedItem = item => ({
  title: item.description,
  project: item.project,
  user: item.user,
  time: msToHours(item.dur),
  key: `${item.user}.${item.project}.${item.description}`,
});

const getProjectsFromSummaryReport = report =>
  calculatePercentages(sortItemsByTime(
    report.data.map(project => ({
      title: project.title.project,
      time: msToHours(project.time),
    }))))

// array of all the different time entries from the summary
// including a Jira issue key if we can parse one
const getItemsFromSummaryReport = report =>
  _.flatten(
    report.data.map(group =>
      group.items.map(subItem => ({
        title: subItem.title.time_entry,
        time: msToHours(subItem.time),
        issueKey: parseIssueKey(subItem.title.time_entry),
      })),
    ),
  );


const parseSummaryReport = report => {
  const items = getItemsFromSummaryReport(report);

  return {
    time: msToHours(report.total_grand),
    projects: getProjectsFromSummaryReport(report),
    items: useIssueTitles(mergeItems(items)),
  };
};


const saveReportItems = report => {
  return sequential(report.data, async (item) => {
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
    await TogglEntry.create({
      ...item,
      issueKey: parseIssueKey(item.description),
      hours: msToHours(item.dur),
    }, {
      fields: getModelFields(TogglEntry),
    }).catch(ignoreUniqueErrors);
  });
};


/**
 * Parse an array of TogglEntry for a detailed report.
 * Group entries by user, merge duplicates and sum hours.
 * @param  {TogglEntry[]} entries
 * @return {Object[]}
 */
const parseEntriesForDetailed = entries => {
  const groupedByUser = _.groupBy(entries, (entry) => entry.user);
  return Object.keys(groupedByUser).map((user) => {
    const userEntries = mergeEntries(groupedByUser[user]);
    const total = twoDP(userEntries.reduce((acc, entry) => acc + entry.hours, 0));
    return {
      user,
      entries: userEntries,
      total,
    };
  });

};

const parseDetailedReport = report => {
  const parsedItems = report.data.map(parseDetailedItem);
  const mergedItems = mergeItems(parsedItems);
  const groupedByUser = _.groupBy(mergedItems, (item) => item.user);
  const cleaned = Object.keys(groupedByUser).map((user) => {
    const group = groupedByUser[user];
    const items = group.map(item => ({
      ...item,
      issueKey: parseIssueKey(item.title),
    }));
    const time = twoDP(group.reduce((acc, item) => acc + item.time, 0));
    return ({
      user,
      time,
      items,
    });
  });

  return {
    time: msToHours(report.total_grand),
    items: cleaned,
  };
};

// update the toggl groups and users
const updateTogglGroups = async () => {
  const groups = await getGroups();
  const groupModels = await Promise.all(groups.map((group) =>
    TogglGroup.findOrCreate({
      where: {
        id: group.id,
      },
      defaults: definedFieldsOnly(group, TogglGroup),
  }).then(getModel)
    ));

  // right now we only care about active users.
  const users = await getWorkspaceUsers()
    .then(workspaceUsers => workspaceUsers
      .filter((user) => user.active && !user.inactive)
    );
  const userModels = await Promise.all(users.map((user) => {
    const { uid: id, name } = user;
    return TogglUser.findOrCreate({
      where: {
        id,
      },
      defaults: {
        user: name,
      },
    }).then(getModel)
  }));

  users.forEach((user, i) => {
    userModels[i].setGroups(groupModels.filter(model => user.group_ids.includes(model.get().id)))
  });
}

module.exports = {
  getSummary,
  getDetailed,
  parseDetailedReport,
  parseEntriesForDetailed,
  saveReportItems,
  getProjectsFromSummaryReport,
  getGroups,
  getUsers,
  getWorkspaceUsers,
  updateTogglGroups,
};
