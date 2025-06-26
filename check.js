const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const url = new URL('/doc/1', API_BASE_URL);

const options = {
  hostname: url.hostname,
  port: url.port || 80,
  path: url.pathname,
  method: 'GET'
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let data = '';
  res.on('data', d => {
    data += d;
  });
  res.on('end', () => {
    try {
        console.log('Document data:', JSON.parse(data));
    } catch(e) {
        console.error("Could not parse JSON response.");
        console.error("Raw response:", data);
    }
  });
});

req.on('error', error => {
  console.error('Error fetching document:', error);
});

req.end(); 