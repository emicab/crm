const http = require('http');

const data = JSON.stringify({
  message: "cual es el producto con mayor margen de ganancia?",
  sessionId: "test-session",
  userId: 1
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/agente-ia',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', res.headers['content-type']);
    console.log('BODY:', body.substring(0, 2000));
  });
});

req.on('error', console.error);
req.write(data);
req.end();
