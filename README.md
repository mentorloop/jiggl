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

Schedule `npm run cron` to run periodically, and it will:


- Sync Toggl Groups & Users to your DB
- Sync all Toggl entries from the last 7 days to your DB
- Try to parse a Jira issue key from the entry titles
- Hit the Jira API to fetch issues for all the parsed keys and pull those down to the DB
- Sync any Jira Epics and parent issues that your issues belong to


## Running it

```
npm install
npm run cron
```

You can also run `npm start` to manually trigger individual parts of the process, including a basic text printout of toggl entries and their related jira issues from a time period.
