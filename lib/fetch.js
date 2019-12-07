const nodeFetch = require('node-fetch');

const log = require('./log');

const fetch = (url, options = {}) => {
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
    return response.json();
  });
};

module.exports = fetch;
