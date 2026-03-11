const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const testDbPath = path.join(__dirname, 'tmp-myriaddb.sqlite');
process.env.MYRIAD_DB_PATH = testDbPath;
process.env.MYRIAD_SALT = 'test-salt';

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { createApp } = require('../src/server');
const app = createApp();

async function registerAndLogin(username) {
  const password = 'password123';
  await request(app).post('/api/auth/register').send({ username, password }).expect(201);

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username, password })
    .expect(200);

  return loginRes.body.token;
}

test('auth register/login + me', async () => {
  const token = await registerAndLogin('said');

  const me = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(me.body.user.username, 'said');
});

test('events are isolated by user profile', async () => {
  const tokenA = await registerAndLogin('usera');
  const tokenB = await registerAndLogin('userb');

  await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({
      source: 'chat',
      category: 'messaging',
      durationMinutes: 5,
      topic: 'alpha project',
      identifier: 'alice',
    })
    .expect(201);

  await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${tokenB}`)
    .send({
      source: 'chat',
      category: 'messaging',
      durationMinutes: 8,
      topic: 'beta project',
      identifier: 'bob',
    })
    .expect(201);

  const summaryA = await request(app)
    .get('/api/summary?days=7')
    .set('Authorization', `Bearer ${tokenA}`)
    .expect(200);

  const summaryB = await request(app)
    .get('/api/summary?days=7')
    .set('Authorization', `Bearer ${tokenB}`)
    .expect(200);

  assert.equal(summaryA.body.totals.totalEvents, 1);
  assert.equal(summaryB.body.totals.totalEvents, 1);
});

test('whatsapp import and browser history import', async () => {
  const token = await registerAndLogin('importer');

  const whatsappText =
    '10/03/2026, 10:30 - Said: Hello there\n10/03/2026, 10:31 - Mary: How are you?';

  const importWhatsapp = await request(app)
    .post('/api/import/whatsapp')
    .set('Authorization', `Bearer ${token}`)
    .send({ text: whatsappText })
    .expect(201);

  assert.equal(importWhatsapp.body.imported, 2);

  const historyJson = JSON.stringify([
    {
      url: 'https://example.com',
      title: 'Example',
      visitTime: '2026-03-10T10:00:00Z',
      durationMinutes: 3,
    },
  ]);

  const importHistory = await request(app)
    .post('/api/import/browser-history')
    .set('Authorization', `Bearer ${token}`)
    .send({ text: historyJson })
    .expect(201);

  assert.equal(importHistory.body.imported, 1);

  const exported = await request(app)
    .get('/api/events/export')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.match(exported.text, /identity_hash/);
  assert.doesNotMatch(exported.text, /"alice"|"bob"|"Said"/);
});

test('reassign unknown events to selected device', async () => {
  const token = await registerAndLogin('reassigner');

  await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      source: 'browser',
      category: 'browsing',
      durationMinutes: 12,
      identifier: 'unknown-device-case',
    })
    .expect(201);

  const before = await request(app)
    .get('/api/summary?days=7&device=unknown')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(before.body.totals.totalEvents, 1);

  const reassign = await request(app)
    .post('/api/events/reassign-unknown-device')
    .set('Authorization', `Bearer ${token}`)
    .send({ device: 'laptop' })
    .expect(200);

  assert.equal(reassign.body.updated, 1);

  const afterUnknown = await request(app)
    .get('/api/summary?days=7&device=unknown')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const afterLaptop = await request(app)
    .get('/api/summary?days=7&device=laptop')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(afterUnknown.body.totals.totalEvents, 0);
  assert.equal(afterLaptop.body.totals.totalEvents, 1);
});
