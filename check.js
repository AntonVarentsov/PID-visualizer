const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/doc/1',
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