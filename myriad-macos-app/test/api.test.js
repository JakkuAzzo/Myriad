const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const testDbPath = path.join(__dirname, 'tmp-myriaddb.sqlite');
process.env.MYRIAD_DB_PATH = testDbPath;
process.env.MYRIAD_SALT = 'test-salt';
process.env.MYRIAD_ADMIN_KEY = 'admin-test-key';

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

test('telegram import ingests message events', async () => {
  const token = await registerAndLogin('telegram-importer');

  const telegramPayload = {
    name: 'Team Chat',
    messages: [
      {
        id: 1,
        type: 'message',
        date: '2026-03-10T10:30:00Z',
        from: 'Alex',
        text: 'Standup in 10 minutes',
      },
      {
        id: 2,
        type: 'message',
        date: '2026-03-10T10:45:00Z',
        from: 'Jordan',
        text: 'On my way',
      },
    ],
  };

  const importTelegram = await request(app)
    .post('/api/import/upload?connector=telegram')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', Buffer.from(JSON.stringify(telegramPayload), 'utf8'), 'telegram.json')
    .expect(201);

  assert.equal(importTelegram.body.connector, 'telegram');
  assert.equal(importTelegram.body.imported, 2);

  const summary = await request(app)
    .get('/api/summary?days=90')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(summary.body.totals.totalEvents, 2);
  assert.ok(Array.isArray(summary.body.conversationFrequency));
});

test('habit goals and intervention plan support behavior-change workflows', async () => {
  const token = await registerAndLogin('habit-user');

  await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      source: 'browser',
      category: 'social',
      durationMinutes: 120,
      device: 'phone',
      identifier: 'habit-1',
      externalId: 'habit-evt-1',
    })
    .expect(201);

  const created = await request(app)
    .post('/api/habits/goals')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Reduce social browsing',
      category: 'social',
      device: 'phone',
      maxDailyMinutes: 60,
      interventionPlan: 'Block social apps after 10pm',
    })
    .expect(201);

  assert.equal(created.body.goal.title, 'Reduce social browsing');
  assert.equal(created.body.goal.category, 'social');

  const goals = await request(app)
    .get('/api/habits/goals')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(goals.body.goals.length, 1);

  const plan = await request(app)
    .get('/api/habits/plan?days=7')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.ok(Array.isArray(plan.body.goalProgress));
  assert.ok(Array.isArray(plan.body.interventions));
  assert.equal(plan.body.goalProgress[0].goal.title, 'Reduce social browsing');

  await request(app)
    .delete(`/api/habits/goals/${created.body.goal.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
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

test('batch ingest supports idempotent external ids', async () => {
  const token = await registerAndLogin('batcher');

  const payload = {
    events: [
      {
        source: 'chat',
        category: 'messaging',
        durationMinutes: 4,
        topic: 'project sync',
        identifier: 'batch-user',
        externalId: 'evt-1',
        clientPlatform: 'ios',
      },
      {
        source: 'chat',
        category: 'messaging',
        durationMinutes: 5,
        topic: 'project sync followup',
        identifier: 'batch-user',
        externalId: 'evt-2',
        clientPlatform: 'electron',
      },
      {
        source: 'chat',
        category: 'messaging',
        durationMinutes: 5,
        topic: 'duplicate id should skip',
        identifier: 'batch-user',
        externalId: 'evt-2',
        clientPlatform: 'electron',
      },
    ],
  };

  const ingest = await request(app)
    .post('/api/events/batch')
    .set('Authorization', `Bearer ${token}`)
    .send(payload)
    .expect(201);

  assert.equal(ingest.body.ingested, 2);
  assert.equal(ingest.body.skipped, 1);

  const summary = await request(app)
    .get('/api/summary?days=7')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(summary.body.totals.totalEvents, 2);
  assert.ok(Array.isArray(summary.body.platformBreakdown));
});

test('global summary requires admin key and aggregates across users', async () => {
  const tokenA = await registerAndLogin('globala');
  const tokenB = await registerAndLogin('globalb');

  await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({
      source: 'browser',
      category: 'browsing',
      durationMinutes: 9,
      clientPlatform: 'ios',
      externalId: 'ga-1',
    })
    .expect(201);

  await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${tokenB}`)
    .send({
      source: 'chat',
      category: 'messaging',
      durationMinutes: 7,
      clientPlatform: 'electron',
      externalId: 'gb-1',
    })
    .expect(201);

  await request(app)
    .get('/api/summary/global?days=7')
    .set('Authorization', `Bearer ${tokenA}`)
    .expect(403);

  const globalSummary = await request(app)
    .get('/api/summary/global?days=7')
    .set('Authorization', `Bearer ${tokenA}`)
    .set('x-myriad-admin-key', 'admin-test-key')
    .expect(200);

  assert.ok(globalSummary.body.totals.totalEvents >= 2);
  assert.ok(Array.isArray(globalSummary.body.platformBreakdown));
});

test('enhanced summary returns ai payload for personal and global scopes', async () => {
  const token = await registerAndLogin('enhanced');

  await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      source: 'chat',
      category: 'messaging',
      durationMinutes: 6,
      topic: 'planning',
      clientPlatform: 'ios',
      externalId: 'enhanced-1',
    })
    .expect(201);

  const personal = await request(app)
    .get('/api/summary/enhanced?scope=personal&days=7&device=all')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(personal.body.aiSummary.scope, 'personal');
  assert.ok(typeof personal.body.aiSummary.narrative === 'string');
  assert.ok(Array.isArray(personal.body.aiSummary.highlights));
  assert.equal(personal.body.cache.hit, false);

  const personalCached = await request(app)
    .get('/api/summary/enhanced?scope=personal&days=7&device=all')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(personalCached.body.cache.hit, true);
  assert.equal(personalCached.body.aiSummary.generatedAt, personal.body.aiSummary.generatedAt);

  await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      source: 'browser',
      category: 'browsing',
      durationMinutes: 3,
      topic: 'after-cache-invalidation',
      externalId: 'enhanced-2',
      clientPlatform: 'electron',
    })
    .expect(201);

  const afterInvalidate = await request(app)
    .get('/api/summary/enhanced?scope=personal&days=7&device=all')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(afterInvalidate.body.cache.hit, false);

  await request(app)
    .get('/api/summary/enhanced?scope=global&days=7&device=all')
    .set('Authorization', `Bearer ${token}`)
    .expect(403);

  const global = await request(app)
    .get('/api/summary/enhanced?scope=global&days=7&device=all')
    .set('Authorization', `Bearer ${token}`)
    .set('x-myriad-admin-key', 'admin-test-key')
    .expect(200);

  assert.equal(global.body.aiSummary.scope, 'global');
  assert.ok(Array.isArray(global.body.summary.platformBreakdown));
  assert.equal(global.body.cache.hit, false);

  const globalCached = await request(app)
    .get('/api/summary/enhanced?scope=global&days=7&device=all')
    .set('Authorization', `Bearer ${token}`)
    .set('x-myriad-admin-key', 'admin-test-key')
    .expect(200);

  assert.equal(globalCached.body.cache.hit, true);
});

test('onnx provider mode returns enhanced payload shape', async () => {
  process.env.MYRIAD_LLM_PROVIDER = 'onnx';

  const token = await registerAndLogin('onnxmode');
  await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      source: 'chat',
      category: 'messaging',
      durationMinutes: 2,
      topic: 'onnx smoke',
      externalId: 'onnx-1',
      clientPlatform: 'ios',
    })
    .expect(201);

  const response = await request(app)
    .get('/api/summary/enhanced?scope=personal&days=7&device=all')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.ok(typeof response.body.aiSummary.narrative === 'string');
  assert.ok(Array.isArray(response.body.aiSummary.highlights));
  assert.ok(typeof response.body.aiSummary.provider === 'string');

  delete process.env.MYRIAD_LLM_PROVIDER;
});
