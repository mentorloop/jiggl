const _ = require('lodash');

const {
  twoDP,
  useIssueTitles,
} = require('./util');
const { SLACK_ENDPOINT, SLACK_CHANNEL } = require('./config');
const Doc = require('./doc');
const fetch = require('./fetch');


/**
 * Merge duplicates in an array of TogglEntry objects.
 * Groups by .issueKey or .description and sums .hours
 * Any other properties are pulled from the first object.
 * @param  {TogglEntry[]} entries
 * @return {TogglEntry[]}
 */
const mergeEntries = (entries) => {
  const merger = (entry) => entry.issueKey || entry.description;
  const grouped = _.groupBy(entries, merger);
  const summed = Object.keys(grouped).map(keyOrDescription => {
    const group = grouped[keyOrDescription];
    const hours = group.reduce((acc, item) => acc + item.hours, 0);
    return {
      ...group[0],
      hours,
    };
  });
  return summed;
};

/**
 * Group Toggl entries by user and merge duplicate entries.
 * @param  {TogglEntry[]} entries
 * @return {Object[]}
 */
const parseEntriesForReport = entries => {
  const groupedByUser = _.groupBy(entries, entry => entry.user);
  return Object.keys(groupedByUser).map(user => {
    const userEntries = mergeEntries(groupedByUser[user]);
    const total = twoDP(
      userEntries.reduce((acc, entry) => acc + entry.hours, 0),
    );
    return {
      user,
      entries: userEntries,
      total,
    };
  });
};

/**
 * Generate a report of Toggl entries.
 * Highlight any users that have got entries without
 * a project or a description.
 */
const getTogglReport = async (entries, { since, until }) => {
  const doc = new Doc();

  const dateRange =
    since === until ? since : `${since} - ${until}`;
  const title = `Toggl Summary ${dateRange}`;

  doc.title(title);
  doc.log();
  const usersWithProblems = new Set();

  const parsedEntries = parseEntriesForReport(entries);
  parsedEntries.forEach(userSummary => {
    const title = `${userSummary.user}: ${userSummary.total}`;
    doc.title(title, '-');
    useIssueTitles(userSummary.entries).forEach(entry => {
      const title = entry.jiraissue
        ? `[${entry.jiraissue.key}] ${entry.jiraissue.summary}`
        : `* ${entry.description || 'NO DESCRIPTION'}`;
      const { project, hours } = entry;
      const projectName = project || 'NO PROJECT';
      doc.log(`${title} - ${twoDP(hours)} (${projectName})`);
      if (!project || !entry.description) {
        usersWithProblems.add(userSummary.user);
      }
    });
    doc.log();
  });
  if (usersWithProblems.size) {
    doc.log();
    doc.title('Entries needing fixing');
    doc.log(
      `${Array.from(usersWithProblems).join(' & ')} ${
        usersWithProblems.size === 1 ? 'has' : 'have'
      } entries with no description or project`,
    );
  }

  if (!entries.length) {
    doc.log('No Toggl entries found in time period.');
  }

  return doc.get();
}

/**
 * Print a report to the console
 */
const printTogglReport = async (entries, opts) => {
  const str = await getTogglReport(entries, opts);
  console.clear();
  console.log(str);
}

const slackTogglReport = async (entries, opts) => {
  if (!SLACK_ENDPOINT) {
    throw new Error('SLACK_ENDPOINT env var is not set, unable to post report to Slack.');
  }
  if (!SLACK_CHANNEL) {
    throw new Error('SLACK_CHANNEL env var is not set, unable to post report to Slack.');
  }
  const str = await getTogglReport(entries, opts);

  try {
    await fetch(SLACK_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        channel: SLACK_CHANNEL,
        username: 'jigglbot',
        text: `\`\`\`${str}\`\`\``,
        icon_emoji: ':alarm_clock:',
      }),
    }, false);
    console.log(`Report has been broadcast to ${SLACK_CHANNEL}`);
  } catch (error) {
    console.error('Unable to broadcast report to Slack', error);
  }
}

module.exports = {
  printTogglReport,
  slackTogglReport,
};
