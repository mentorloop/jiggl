# jiggl
### jira + toggl = jiggl

Pull data from Jira and Toggl into a database so you query it and build reports.


## Why?

1. We store time tracking data in Toggl
2. We store various other data in Jira tickets
3. We want to be able to correlate those two; ie, in December we spent X% of our time on Feature tickets and Y% on Support tickets.
4. We want the flexibility of querying the data from a database rather than relying on Jira's built-in reports


## How?

Users simply prefix Toggl entries with a Jira issue key:

```
APP-1420 Fix broken tests
```

Then Jiggl will correlate that Toggl entry with the Jira issue.


## Yeah but actually how?

Schedule `npm run sync` to run periodically, and it will:


- Sync Toggl Groups & Users to your DB
- Sync all Toggl entries from the last 7 days to your DB
- Try to parse a Jira issue key from the entry titles
- Hit the Jira API to fetch issues for all the parsed keys and pull those down to the DB
- Sync any Jira Epics and parent issues that your issues belong to

## Installation

```
# clone the repository
npm install
```


## Running it

To run the sync script (I recommend doing this as a cronjob),

```
npm run sync
```

To run the interactive menu, use:

```
npm start
```

This will allow you to manually trigger individual parts of the process, including a basic text printout of toggl entries and their related jira issues from a time period.


## Last business day report

Running the "last business day" report prints out all the Toggl entries for a group and flags whether anybody's logged anything without a description or a project. It's a useful thing to run each morning so people can easily see and fix up missing or incorrect entries, before they forget what they were doing.


You can run `npm start -- lastdaily --group 94745` to run the last business day for Toggl group 94745. If you want to know what your Toggl group IDs are, run the "sync toggl groups" command it'll print them out.

You can also set a SLACK_ENDPOINT (full https://hooks.slack.com/services/blah-blah-blah address) and SLACK_CHANNEL (including the hash) env var and pass `--output slack` to push the results straight to a Slack channel, like:

```
npm start -- lastdaily --group 94745 --output slack
```
