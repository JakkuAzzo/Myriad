const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const {
  createUser,
  getUserByUsername,
  getUserById,
  getOrCreateLocalUser,
  listUsers,
  createAuthToken,
  getUserByToken,
  deleteAuthToken,
  getSetting,
  setSetting,
  insertManyEvents,
  deleteAllEvents,
  reassignUnknownEventsToDevice,
  exportEvents,
  getSummary,
  getGlobalSummary,
  buildSummaryCacheKey,
  getSummaryCache,
  purgeExpiredSummaryCache,
  upsertSummaryCache,
  getRecentEventSamples,
} = require('./db');
const { anonymizeIdentifier } = require('./anonymize');
const {
  parseWhatsAppExport,
  parseTelegramExport,
  parseBrowserHistoryImport,
} = require('./connectors');
const { generateEnhancedSummary } = require('./llm');

const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

function createToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return req.headers['x-auth-token'] || null;
}

function isConsentEnabled(userId) {
  const setting = getSetting(userId, 'consentEnabled');
  return setting === null ? true : setting === 'true';
}

function parseOccurredAt(rawOccurredAt) {
  if (!rawOccurredAt) {
    return new Date().toISOString();
  }

  const date = new Date(rawOccurredAt);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function normalizeClientPlatform(value) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!raw) {
    return 'unknown';
  }
  if (raw === 'ios' || raw === 'iphone' || raw === 'ipad') {
    return 'ios';
  }
  if (raw === 'electron' || raw === 'desktop' || raw === 'macos') {
    return 'electron';
  }
  return raw.slice(0, 24);
}

function inferClientPlatformFromRequest(req) {
  const explicit = req.headers['x-myriad-client-platform'];
  if (typeof explicit === 'string' && explicit.trim()) {
    return normalizeClientPlatform(explicit);
  }

  const userAgent = String(req.headers['user-agent'] || '').toLowerCase();
  if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ios')) {
    return 'ios';
  }
  if (userAgent.includes('electron')) {
    return 'electron';
  }

  return 'unknown';
}

function sanitizeEvent(raw) {
  const occurredAt = parseOccurredAt(raw.occurredAt);
  const source = raw.source === 'chat' ? 'chat' : 'browser';
  const appVersion = typeof raw.appVersion === 'string' ? raw.appVersion.trim().slice(0, 40) : null;
  const osVersion = typeof raw.osVersion === 'string' ? raw.osVersion.trim().slice(0, 40) : null;
  const externalId = typeof raw.externalId === 'string' && raw.externalId.trim()
    ? raw.externalId.trim().slice(0, 96)
    : null;

  return {
    device: typeof raw.device === 'string' && raw.device.trim() ? raw.device.trim().slice(0, 40) : 'unknown',
    occurredAt,
    source,
    category: (raw.category || 'uncategorized').slice(0, 40),
    durationMinutes: Number.isFinite(raw.durationMinutes)
      ? Math.max(0, Math.round(raw.durationMinutes))
      : 0,
    sentiment:
      typeof raw.sentiment === 'number' && raw.sentiment >= -1 && raw.sentiment <= 1
        ? raw.sentiment
        : null,
    topic: typeof raw.topic === 'string' ? raw.topic.slice(0, 80) : null,
    identityHash: anonymizeIdentifier(raw.identifier || null),
    metadata: typeof raw.metadata === 'string' ? raw.metadata.slice(0, 1200) : null,
    clientPlatform: normalizeClientPlatform(raw.clientPlatform),
    appVersion,
    osVersion,
    externalId,
  };
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  function resolveUser(req, res, next) {
    const token = getTokenFromRequest(req);
    if (token) {
      const user = getUserByToken(token);
      if (user) {
        req.user = user;
        req.token = token;
        return next();
      }
    }

    req.user = getOrCreateLocalUser();
    return next();
  }

  function requireAdmin(req, res, next) {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    return next();
  }

  function isAdminRequest(req) {
    const configuredKey = process.env.MYRIAD_ADMIN_KEY;
    const providedKey = typeof req.headers['x-myriad-admin-key'] === 'string'
      ? req.headers['x-myriad-admin-key']
      : '';
    const usingConfiguredKey = Boolean(configuredKey);
    const hasValidKey = usingConfiguredKey && providedKey === configuredKey;
    const localFallback = !usingConfiguredKey && req.user && req.user.username === 'local';
    return hasValidKey || localFallback;
  }

  function parseIncomingRows(payload) {
    const rows = Array.isArray(payload?.events) ? payload.events : [payload];
    return rows.filter((row) => row && typeof row === 'object');
  }

  function ingestRows(userId, rows, defaults = {}) {
    if (!rows.length) {
      return { ingested: 0, skipped: 0 };
    }

    return insertManyEvents(
      userId,
      rows.map((row) => sanitizeEvent({ ...defaults, ...row }))
    );
  }

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'Myriad',
      users: listUsers().length,
    });
  });

  app.post('/api/auth/register', async (req, res) => {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (username.length < 3 || password.length < 8) {
      return res.status(400).json({ error: 'Username >= 3 chars and password >= 8 chars required.' });
    }

    if (getUserByUsername(username)) {
      return res.status(409).json({ error: 'Username already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = createUser(username, passwordHash);
    setSetting(userId, 'consentEnabled', 'true');

    return res.status(201).json({
      user: getUserById(userId),
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = getUserByUsername(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = createToken();
    createAuthToken(token, user.id);

    return res.json({
      token,
      user: getUserById(user.id),
    });
  });

  app.get('/api/auth/me', resolveUser, (req, res) => {
    res.json({ user: req.user });
  });

  app.post('/api/auth/logout', resolveUser, (req, res) => {
    if (req.token) {
      deleteAuthToken(req.token);
    }
    res.json({ loggedOut: true });
  });

  app.get('/api/users', resolveUser, (req, res) => {
    res.json({ users: listUsers() });
  });

  app.get('/api/consent', resolveUser, (req, res) => {
    res.json({ enabled: isConsentEnabled(req.user.id) });
  });

  app.post('/api/consent', resolveUser, (req, res) => {
    const enabled = Boolean(req.body.enabled);
    setSetting(req.user.id, 'consentEnabled', enabled ? 'true' : 'false');
    res.json({ enabled });
  });

  app.post('/api/events', resolveUser, (req, res) => {
    if (!isConsentEnabled(req.user.id)) {
      return res.status(403).json({ error: 'Collection disabled by user consent setting.' });
    }

    const rows = parseIncomingRows(req.body);
    const inferredPlatform = inferClientPlatformFromRequest(req);

    if (!rows.length) {
      return res.status(400).json({ error: 'No events provided.' });
    }

    const result = ingestRows(req.user.id, rows, { clientPlatform: inferredPlatform });

    return res.status(201).json(result);
  });

  app.post('/api/events/batch', resolveUser, (req, res) => {
    if (!isConsentEnabled(req.user.id)) {
      return res.status(403).json({ error: 'Collection disabled by user consent setting.' });
    }

    const rows = parseIncomingRows(req.body);
    const inferredPlatform = inferClientPlatformFromRequest(req);
    if (!rows.length) {
      return res.status(400).json({ error: 'No events provided.' });
    }

    const result = ingestRows(req.user.id, rows, { clientPlatform: inferredPlatform });

    return res.status(201).json(result);
  });

  app.post('/api/events/sample-seed', resolveUser, (req, res) => {
    if (!isConsentEnabled(req.user.id)) {
      return res.status(403).json({ error: 'Collection disabled by user consent setting.' });
    }

    const categories = ['social', 'learning', 'work', 'entertainment'];
    const topics = ['project', 'friends', 'study', 'news', 'sports'];
    const sources = ['chat', 'browser'];
    const rows = [];
    const devices = ['phone', 'laptop', 'tablet', 'workstation'];

    for (let i = 0; i < 120; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - Math.floor(Math.random() * 13));
      d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

      rows.push(
        sanitizeEvent({
          occurredAt: d.toISOString(),
          device: devices[Math.floor(Math.random() * devices.length)],
          source: sources[Math.floor(Math.random() * sources.length)],
          category: categories[Math.floor(Math.random() * categories.length)],
          durationMinutes: 2 + Math.floor(Math.random() * 48),
          sentiment: Number((Math.random() * 2 - 1).toFixed(2)),
          topic: topics[Math.floor(Math.random() * topics.length)],
          identifier: `user-${Math.floor(Math.random() * 5) + 1}`,
        })
      );
    }

    insertManyEvents(req.user.id, rows);

    res.status(201).json({ seeded: 120 });
  });

  app.post('/api/import/whatsapp', resolveUser, (req, res) => {
    const text = String(req.body.text || '');
    const parsed = parseWhatsAppExport(text).map((x) => sanitizeEvent(x));
    insertManyEvents(req.user.id, parsed);
    res.status(201).json({ connector: 'whatsapp', imported: parsed.length });
  });

  app.post('/api/import/telegram', resolveUser, (req, res) => {
    const jsonText = typeof req.body.json === 'string' ? req.body.json : JSON.stringify(req.body.json || {});
    const parsed = parseTelegramExport(jsonText).map((x) => sanitizeEvent(x));
    insertManyEvents(req.user.id, parsed);
    res.status(201).json({ connector: 'telegram', imported: parsed.length });
  });

  app.post('/api/import/browser-history', resolveUser, (req, res) => {
    const text = typeof req.body.text === 'string' ? req.body.text : JSON.stringify(req.body.history || []);
    const device = typeof req.body.device === 'string' ? req.body.device : null;
    const parsed = parseBrowserHistoryImport(text).map((x) => sanitizeEvent({ ...x, device }));
    insertManyEvents(req.user.id, parsed);
    res.status(201).json({ connector: 'browser-history', imported: parsed.length });
  });

  app.post('/api/import/upload', resolveUser, upload.single('file'), (req, res) => {
    const connector = String(req.query.connector || '').toLowerCase();
    const fileContent = req.file ? req.file.buffer.toString('utf8') : '';

    let parsed = [];
    if (connector === 'whatsapp') {
      parsed = parseWhatsAppExport(fileContent);
    } else if (connector === 'telegram') {
      parsed = parseTelegramExport(fileContent);
    } else if (connector === 'browser-history') {
      parsed = parseBrowserHistoryImport(fileContent);
    } else {
      return res.status(400).json({ error: 'Unsupported connector.' });
    }

    const device = typeof req.query.device === 'string' ? req.query.device : null;
    const sanitized = parsed.map((x) => sanitizeEvent({ ...x, device }));
    insertManyEvents(req.user.id, sanitized);
    return res.status(201).json({ connector, imported: sanitized.length });
  });

  app.get('/api/summary', resolveUser, (req, res) => {
    const days = Number(req.query.days || 7);
    const device = typeof req.query.device === 'string' ? req.query.device : null;
    res.json(getSummary(req.user.id, days, device));
  });

  app.get('/api/summary/global', resolveUser, requireAdmin, (req, res) => {
    const days = Number(req.query.days || 7);
    const device = typeof req.query.device === 'string' ? req.query.device : null;
    res.json(getGlobalSummary(days, device));
  });

  app.get('/api/summary/enhanced', resolveUser, async (req, res) => {
    const days = Number(req.query.days || 7);
    const device = typeof req.query.device === 'string' ? req.query.device : null;
    const scope = req.query.scope === 'global' ? 'global' : 'personal';
    const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(days, 90)) : 7;
    const safeDevice = typeof device === 'string' && device.trim() ? device.trim() : 'all';
    const userId = scope === 'global' ? null : req.user.id;

    if (scope === 'global' && !isAdminRequest(req)) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const cacheKey = buildSummaryCacheKey({
      scope,
      userId,
      days: safeDays,
      device: safeDevice,
    });

    purgeExpiredSummaryCache();
    const cached = getSummaryCache(cacheKey);
    if (cached) {
      return res.json({
        ...cached.payload,
        cache: {
          hit: true,
          key: cached.cacheKey,
          expiresAt: cached.expiresAt,
        },
      });
    }

    const summary = scope === 'global'
      ? getGlobalSummary(days, device)
      : getSummary(req.user.id, days, device);

    const userIds = scope === 'global' ? [] : [req.user.id];
    const eventSamples = getRecentEventSamples(userIds, safeDays, summary.selectedDevice, 10);

    const enhanced = await generateEnhancedSummary(summary, {
      days: safeDays,
      device: summary.selectedDevice,
      scope,
      eventSamples,
    });

    const ttlHours = Number(process.env.MYRIAD_SUMMARY_CACHE_TTL_HOURS || 6);
    const safeTtl = Number.isFinite(ttlHours) ? Math.max(1, Math.min(ttlHours, 168)) : 6;
    const generatedAt = enhanced.aiSummary.generatedAt;
    const expiresAt = new Date(Date.now() + safeTtl * 60 * 60 * 1000).toISOString();

    upsertSummaryCache({
      cacheKey,
      scope,
      userId,
      days: safeDays,
      device: summary.selectedDevice,
      payload: enhanced,
      provider: enhanced.aiSummary.provider,
      model: enhanced.aiSummary.model,
      generatedAt,
      expiresAt,
    });

    return res.json(
      {
        ...enhanced,
        cache: {
          hit: false,
          key: cacheKey,
          expiresAt,
        },
      }
    );
  });

  app.get('/api/events/export', resolveUser, (req, res) => {
    const data = exportEvents(req.user.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="myriad-events-export.json"');
    res.send(JSON.stringify(data, null, 2));
  });

  app.delete('/api/events', resolveUser, (req, res) => {
    deleteAllEvents(req.user.id);
    res.json({ deleted: true });
  });

  app.post('/api/events/reassign-unknown-device', resolveUser, (req, res) => {
    const device = typeof req.body.device === 'string' ? req.body.device : '';
    const updated = reassignUnknownEventsToDevice(req.user.id, device);
    res.json({ updated, device: device || null });
  });

  app.get('/stats', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'stats.html'));
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Myriad running on http://localhost:${PORT}`);
  });
}

module.exports = {
  createApp,
  sanitizeEvent,
};
