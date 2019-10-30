# jiggl
### jira + toggl = jiggl

Connect Jira to Toggl and print out reports.


## Todo
- detailed reports aren't linking all issues?
- summary report: % of tickets with a jira issue
  - or % of time? or both
- sqlite cache for jira issues



## Report types

There's two basic types of reports, Summary and Detailed.


### Summary report


- Total time recorded
- What was the project breakdown
- What was the Jira issue breakdown (by parents)
- What was the epic breakdown
- % of tickets with a Jira issue
- Can be interactively edited/aggregated (see *editing reports*)


### Detailed report

- Group by users
- Aggregate time entries with the same name/project
- Link to Jira issues
- Highlight entries that can't be linked
- Highlight entries with no description or project


### Yesterday
A detailed report for the last business day.


### Last Month
A summary report for the last calendar month.



## Editing reports

Summary reports can be interactively edited to merge/remove/rename entries.

- For a list of 'items' with a .title and .time
  - Remove one
  - Merge with another one
  - Rename it
