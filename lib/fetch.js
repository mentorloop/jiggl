const nodeFetch = require('node-fetch');

const log = require('./log');

const fetch = (url, options = {}, parseJson = true) => {
  log.debug(`fetching ${url}`);
  return nodeFetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }).then(response => {
    if (!response.ok) {
      throw new Error(response.status || 'Fetch failed');
    }
    return parseJson ? response.json() : response.text();
  });
};

module.exports = fetch;
