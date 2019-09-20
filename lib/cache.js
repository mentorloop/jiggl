const ISSUE_CACHE = new Map();


const getIssueFromCache = issueKey => ISSUE_CACHE.get(issueKey);
const saveIssueToCache = issue => ISSUE_CACHE.set(issue.key, issue);
const getCachedIssueKeys = () => Array.from(ISSUE_CACHE.keys());

module.exports = {
  getIssueFromCache,
  saveIssueToCache,
  getCachedIssueKeys,
}
