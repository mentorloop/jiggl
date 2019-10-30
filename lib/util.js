const _ = require('lodash');
const addBusinessDays = require('date-fns/addBusinessDays');
const { format, subMonths, startOfMonth, endOfMonth } = require('date-fns');

const TOGGL_DATE_FORMAT = 'yyyy-MM-dd';

const formatTogglDate = (date) => format(date, TOGGL_DATE_FORMAT);

// clear screen
// pretty sure this is cross-platform-ish
const clearScreen = () => process.stdout.write('\033c');

// console log arguments and return
const tap = args => {
  console.log(JSON.stringify(args, null, 2))
  return args;
};

// get since/until object for the last month
const lastMonth = () => {
  const today = new Date();
  const lastMonth = subMonths(today, 1);
  return {
    since: formatTogglDate(startOfMonth(lastMonth)),
    until: formatTogglDate(endOfMonth(lastMonth)),
  };
};

// get since/until object for the last business day
const lastBusinessDay = () => {
  const today = new Date();
  const day = addBusinessDays(today, -1);
  const formatted = formatTogglDate(day);
  return {
    since: formatted,
    until: formatted,
  };
};

// round a value to 2dp
const twoDP = val => Math.round(val * 100) / 100;


// if an item has a Jira issue, use that in place of the time entry title
const useIssueTitles = (items) => items.map(item => ({
  ...item,
  title: item.issue ? `${item.issueKey} ${item.issue.summary}` : item.title,
}));


// merge items by comparing a single field.
// default is to use issueKey and fall back to title.
// use properties from the first item, sum the .time values
// and return sorted by time.
const mergeItems = (items, mergeBy) => {
  const merger = (item) => mergeBy ? item[mergeBy] : item.issueKey || item.title;
  const grouped = _.groupBy(items, merger);
  const summed = Object.keys(grouped).map(title => {
    const group = grouped[title];
    const time = group.reduce((acc, item) => acc + item.time, 0);
    return {
      ...group[0],
      time,
    };
  });
  return sortItemsByTime(summed);
};

// sort an array of items by their .time property, largest to smallest.
const sortItemsByTime = items => _.sortBy(items, item => item.time).reverse();

// given an array of items, add a .percent property
// to each by summing a given field (defaulting to 'time')
const calculatePercentages = (items, countBy = 'time', passedTotal) => {
  const total =
    passedTotal || items.reduce((acc, item) => acc + item[countBy], 0);
  return items.map(item => ({
    ...item,
    percent: Math.round((item[countBy] / total) * 100),
  }));
};

const compose = (...functions) => (props) =>
  functions.reduce((acc, func) => func(acc), props);

module.exports = {
  formatTogglDate,
  tap,
  lastBusinessDay,
  lastMonth,
  twoDP,
  clearScreen,
  useIssueTitles,
  mergeItems,
  sortItemsByTime,
  calculatePercentages,
  compose,
};
