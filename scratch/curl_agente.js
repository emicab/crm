const http = require('http');

const data = JSON.stringify({
  userId: "1",
  message: "productos con mayor margen de ganancias?"
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/agente-ia',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
