const request = require('supertest');
const app = require('../index');

describe('Appointments API', () => {
  let accessToken = null;
  beforeAll(async () => {
    const res = await request(app).post('/api/v1/login').send({ email: 'user@example.com', password: 'password123' });
    accessToken = res.body.token;
  });

  test('GET /appointments returns 200', async () => {
    const res = await request(app).get('/api/v1/appointments').set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toBe(200);
  });
});
