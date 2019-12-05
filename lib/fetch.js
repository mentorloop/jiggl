const nodeFetch = require('node-fetch');

const fetch = (url, options = {}) => {
  // console.log(`fetching ${url}`);
  return nodeFetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }).then(response => {
    if (!response.ok) {
      console.log(response);
      throw new Error('Fetch failed');
    }
    return response.json();
  });
};

module.exports = fetch;
