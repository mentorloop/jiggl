const _ = require('lodash');

const fetch = require('./fetch');
const config = require('./config');

const {
  TOGGL_API_KEY,
  TOGGL_WORKSPACE,
  TOGGL_GROUP,
  JIRA_DEFAULT_PREFIX,
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

const twoDP = val => Math.round(val * 100) / 100;

const msToHours = ms => twoDP(ms / 1000 / 60 / 60);

const getBaseUrl = (reportType, options) =>
  `https://${TOGGL_API_KEY}:api_token@toggl.com/reports/api/v2/${reportType}/${optionsToParams(
    options,
  )}`;

const getReport = (reportType, options) =>
  fetch(getBaseUrl('summary', options));

const getSummary = opts => getReport('summary', opts).then(parseSummaryReport);

const regexes = [
  /APP-(\d+)/, // has APP-123 in it
  /^(\d{3})/,  // starts with 123
];

const parseIssueKey = str => {
  for (let regex of regexes) {
    const match = str.match(regex);
    if (match) {
      return `${JIRA_DEFAULT_PREFIX}-${match[1]}`;
    }
  }
  return null;
};

const parseSummaryItem = item => ({
  ...item,
  title: item.title.project,
  time: msToHours(item.time),
  items: item.items.map(subItem => ({
    title: subItem.title.time_entry,
    time: msToHours(subItem.time),
    issueKey: parseIssueKey(subItem.title.time_entry),
  })),
});

const getProjectsFromSummaryReport = report =>
  _.sortBy(
    report.data.map(project => ({
      title: project.title.project,
      time: msToHours(project.time),
    })),
    project => project.time,
  ).reverse();

// array of all the different time entries from the summary
// including a Jira issue key if we can parse one
const getItemsFromSummaryReport = report =>
  _.flatten(
    report.data.map(project =>
      project.items.map(subItem => ({
        title: subItem.title.time_entry,
        time: msToHours(subItem.time),
        issueKey: parseIssueKey(subItem.title.time_entry),
      })),
    ),
  );

// group and sum items by title/issueKey
const groupAndSumItems = items => {
  const grouped = _.groupBy(items, item => item.issueKey || item.title);
  const summed = Object.keys(grouped).map(groupName => {
    const group = grouped[groupName];
    const groupTotal = group.reduce((acc, item) => acc + item.time, 0);
    return {
      ...group[0],
      title: groupName,
      time: groupTotal,
    };
  });
  return _.sortBy(summed, item => item.time).reverse();
};

const parseSummaryReport = report => {
  const items = getItemsFromSummaryReport(report);

  return {
    total: msToHours(report.total_grand),
    projects: getProjectsFromSummaryReport(report),
    items: groupAndSumItems(items),
  };
};

module.exports = {
  getReport,
  getSummary,
  getProjectsFromSummaryReport,
  groupAndSumItems,
};
