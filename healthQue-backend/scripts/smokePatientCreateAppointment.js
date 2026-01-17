// Smoke test: login as patient and create appointment
// Usage: node scripts/smokePatientCreateAppointment.js

const DEFAULT_BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const { request } = require('http');
const { URL } = require('url');

async function postJson(urlStr, token, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = JSON.stringify(payload);
    const opts = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    const req = request(opts, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

async function main() {
  try {
    const loginUrl = `${DEFAULT_BACKEND}/api/v1/login`;
    const loginRes = await postJson(loginUrl, null, { email: 'patient@hq.com', password: '1234567' });
    console.log('Login status', loginRes.status);
    if (loginRes.status !== 200) { console.error('Login failed', loginRes.body); process.exit(2); }
    const parsed = JSON.parse(loginRes.body || '{}');
    const token = parsed.token || parsed.accessToken || parsed.token;
    if (!token) { console.error('No token in login response', loginRes.body); process.exit(2); }

    const apptUrl = `${DEFAULT_BACKEND}/api/v1/appointments`;
    const scheduled = new Date(Date.now() + 24*60*60*1000).toISOString();
    const apptPayload = { doctor_id: 1, scheduled_at: scheduled, notes: 'Automated booking' };
    const apptRes = await postJson(apptUrl, token, apptPayload);
    console.log('Create appointment status', apptRes.status);
    console.log('Response:', apptRes.body);
    process.exit(apptRes.status >= 200 && apptRes.status < 300 ? 0 : 3);
  } catch (e) {
    console.error('Smoke test failed', e.message || e);
    process.exit(1);
  }
}

main();
