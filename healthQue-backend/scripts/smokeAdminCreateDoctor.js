// Smoke test: create a doctor via admin endpoint
// Usage: set env variables BACKEND_URL and JWT_SECRET, then run `node smokeAdminCreateDoctor.js`

const DEFAULT_BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

async function main() {
  const jwt = require('jsonwebtoken');
  const { request } = require('http');
  const { URL } = require('url');

  const adminPayload = { userId: 1, tenantId: 1, role: 'admin' };
  const token = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '1h' });

  const urlStr = `${DEFAULT_BACKEND}/api/v1/admin/doctors`;
  const url = new URL(urlStr);
  const payload = JSON.stringify({ name: 'Automated Dr Test', email: 'autodr@example.com', password: 'TestPass123', specialty: 'General', location: 'Remote' });

  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Authorization': `Bearer ${token}`
    }
  };

  console.log('Posting to', urlStr);
  const req = request(options, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', body);
      process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 2);
    });
  });
  req.on('error', (err) => {
    console.error('Request failed', err.message || err);
    process.exit(1);
  });
  req.write(payload);
  req.end();
}

main();
