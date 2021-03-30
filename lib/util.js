const _ = require('lodash');
const { format, addBusinessDays, subDays } = require('date-fns');
const { zonedTimeToUtc } = require('date-fns-tz');

const { DAY_START, TIMEZONE } = require('./config');

const TOGGL_DATE_FORMAT = 'yyyy-MM-dd';

// format a date in TOGGL_DATE_FORMAT
const dateToTogglDate = (date) => format(date, TOGGL_DATE_FORMAT);

// and back the other way, using DAY_START in TIMEZONE
const togglDateToDate = (togglDateString) => dateToUtc(`${togglDateString}T${DAY_START}`);

// console log arguments and return
const tap = args => {
  console.log(JSON.stringify(args, null, 2))
  return args;
};

const dateToUtc = (dateString) => zonedTimeToUtc(dateString, TIMEZONE);

// get toggl since/until object for last seven days
const lastSevenDays = () => {
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);
  return {
    since: dateToTogglDate(sevenDaysAgo),
    until: dateToTogglDate(today)
  };
};

const lastXDays = (x) => {
  const today = new Date();
  const xDaysAgo = subDays(today, x);
  return {
    since: dateToTogglDate(xDaysAgo),
    until: dateToTogglDate(today),
  };
};

// get since/until object for the last business day
const lastBusinessDay = () => {
  const today = new Date();
  const day = addBusinessDays(today, -1);
  const formatted = dateToTogglDate(day);
  return {
    since: formatted,
    until: formatted,
  };
};

const currentDay = () => {
  const today = new Date();
  const formatted = dateToTogglDate(today);
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


// run promises in sequence
const sequential = (values, callback) =>
  values.reduce((acc, value, index) =>
    acc.then(results =>
      callback(value, index)
      .then(result => results.concat(result))),
  Promise.resolve([]));


module.exports = {
  dateToTogglDate,
  togglDateToDate,
  tap,
  dateToUtc,
  lastBusinessDay,
  lastSevenDays,
  lastXDays,
  currentDay,
  twoDP,
  useIssueTitles,
  mergeItems,
  sortItemsByTime,
  calculatePercentages,
  sequential,
};
