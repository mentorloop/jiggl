const _ = require('lodash');

const fetch = require('./fetch');
const config = require('./config');
const { tap, twoDP, useIssueTitles, mergeItems, sortItemsByTime, calculatePercentages } = require('./util');
const { TogglEntry, TogglUser, TogglProject, createTogglProject, createTogglUser } = require('../db');

const {
  TOGGL_API_KEY,
  TOGGL_WORKSPACE,
  TOGGL_GROUP,
} = config;

const DEFAULT_PARAMS = {
  user_agent: 'jiggl',
  workspace_id: TOGGL_WORKSPACE,
  members_of_group_ids: TOGGL_GROUP,
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

const getBaseUrl = (reportType, options) =>
  `https://${TOGGL_API_KEY}:api_token@toggl.com/reports/api/v2/${reportType}/${optionsToParams(
    options,
  )}`;

const getReport = (reportType, options) =>
  fetch(getBaseUrl(reportType, options));

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

  if (page > numPages) return merged;

  return getDetailed(opts, merged, ++page);
};


const jiraProjectRegex = new RegExp(`(${config.JIRA_PROJECT_PREFIXES})-(\\d+)`, 'i');

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
  report.data.forEach(async (item) => {
    await createTogglUser({
      id: item.uid,
      user: item.user,
    });
    if (item.pid) {
      await createTogglProject({
        id: item.pid,
        project: item.project,
      });
    }
    await TogglEntry.create(item, {
      fields: Object.keys(TogglEntry.tableAttributes),
    });
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

module.exports = {
  getSummary,
  getDetailed,
  parseDetailedReport,
  saveReportItems,
  getProjectsFromSummaryReport,
};
