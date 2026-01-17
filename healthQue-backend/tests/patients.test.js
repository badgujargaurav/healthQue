const request = require('supertest');
const app = require('../index');

describe('Patients API', () => {
  let accessToken = null;
  beforeAll(async () => {
    // use in-memory demo user
    const res = await request(app).post('/api/v1/login').send({ email: 'user@example.com', password: 'password123' });
    accessToken = res.body.token;
  });

  test('GET /patients returns 200 (may be empty)', async () => {
    const res = await request(app).get('/api/v1/patients').set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(200);
  });
});
