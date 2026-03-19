const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.MYRIAD_DB_PATH || path.join(__dirname, '..', 'data', 'myriad.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    device TEXT NOT NULL DEFAULT 'unknown',
    occurred_at TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    sentiment REAL,
    topic TEXT,
    identity_hash TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events (occurred_at);
  CREATE INDEX IF NOT EXISTS idx_events_source ON events (source);
  CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);
`);

function hasColumn(tableName, columnName) {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return cols.some((c) => c.name === columnName);
}

function isLegacySettingsSchema() {
  const cols = db.prepare('PRAGMA table_info(settings)').all();
  const keyCol = cols.find((c) => c.name === 'key');
  const hasUserId = cols.some((c) => c.name === 'user_id');
  return Boolean(keyCol && keyCol.pk === 1) || !hasUserId;
}

if (isLegacySettingsSchema()) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      UNIQUE(user_id, key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    INSERT OR IGNORE INTO settings_v2 (user_id, key, value)
    SELECT 1, key, value FROM settings;

    DROP TABLE settings;
    ALTER TABLE settings_v2 RENAME TO settings;
  `);
}

if (!hasColumn('events', 'user_id')) {
  db.exec('ALTER TABLE events ADD COLUMN user_id INTEGER');
  db.exec('UPDATE events SET user_id = 1 WHERE user_id IS NULL');
}

if (!hasColumn('events', 'device')) {
  db.exec("ALTER TABLE events ADD COLUMN device TEXT NOT NULL DEFAULT 'unknown'");
}

db.exec('CREATE INDEX IF NOT EXISTS idx_events_user_id ON events (user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_events_device ON events (device)');

if (!hasColumn('events', 'metadata')) {
  db.exec('ALTER TABLE events ADD COLUMN metadata TEXT');
}

if (!hasColumn('events', 'client_platform')) {
  db.exec("ALTER TABLE events ADD COLUMN client_platform TEXT NOT NULL DEFAULT 'unknown'");
}

if (!hasColumn('events', 'app_version')) {
  db.exec('ALTER TABLE events ADD COLUMN app_version TEXT');
}

if (!hasColumn('events', 'os_version')) {
  db.exec('ALTER TABLE events ADD COLUMN os_version TEXT');
}

if (!hasColumn('events', 'external_id')) {
  db.exec('ALTER TABLE events ADD COLUMN external_id TEXT');
}

db.exec('CREATE INDEX IF NOT EXISTS idx_events_client_platform ON events (client_platform)');
db.exec('CREATE INDEX IF NOT EXISTS idx_events_external_id ON events (external_id)');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_events_user_external_id ON events(user_id, external_id) WHERE external_id IS NOT NULL');

db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key)');

db.exec(`
  CREATE TABLE IF NOT EXISTS summary_cache (
    cache_key TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    user_id INTEGER,
    days INTEGER NOT NULL,
    device TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    generated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_summary_cache_expires_at ON summary_cache (expires_at);
  CREATE INDEX IF NOT EXISTS idx_summary_cache_scope_user ON summary_cache (scope, user_id);
`);

function buildSummaryCacheKey({ scope, userId, days, device }) {
  const safeScope = scope === 'global' ? 'global' : 'personal';
  const safeUser = safeScope === 'global' ? 'all' : String(Number(userId) || 0);
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(days, 90)) : 7;
  const safeDevice = typeof device === 'string' && device.trim() ? device.trim() : 'all';
  return `${safeScope}:${safeUser}:${safeDays}:${safeDevice}`;
}

function getSummaryCache(cacheKey) {
  const row = db
    .prepare(
      `
      SELECT cache_key, payload_json, generated_at, expires_at
      FROM summary_cache
      WHERE cache_key = ?
      AND DATETIME(expires_at) > DATETIME('now')
    `
    )
    .get(cacheKey);

  if (!row) {
    return null;
  }

  try {
    return {
      cacheKey: row.cache_key,
      payload: JSON.parse(row.payload_json),
      generatedAt: row.generated_at,
      expiresAt: row.expires_at,
    };
  } catch (_) {
    return null;
  }
}

function purgeExpiredSummaryCache() {
  db.prepare(`DELETE FROM summary_cache WHERE DATETIME(expires_at) <= DATETIME('now')`).run();
}

function upsertSummaryCache({
  cacheKey,
  scope,
  userId,
  days,
  device,
  payload,
  provider,
  model,
  generatedAt,
  expiresAt,
}) {
  db.prepare(
    `
    INSERT INTO summary_cache (
      cache_key,
      scope,
      user_id,
      days,
      device,
      payload_json,
      provider,
      model,
      generated_at,
      expires_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(cache_key) DO UPDATE SET
      payload_json=excluded.payload_json,
      provider=excluded.provider,
      model=excluded.model,
      generated_at=excluded.generated_at,
      expires_at=excluded.expires_at,
      updated_at=CURRENT_TIMESTAMP
  `
  ).run(
    cacheKey,
    scope,
    userId || null,
    Number.isFinite(days) ? Math.max(1, Math.min(days, 90)) : 7,
    typeof device === 'string' && device.trim() ? device.trim() : 'all',
    JSON.stringify(payload),
    provider || null,
    model || null,
    generatedAt,
    expiresAt
  );
}

function invalidateSummaryCacheForUser(userId) {
  db.prepare(
    `
    DELETE FROM summary_cache
    WHERE scope = 'global'
    OR user_id = ?
  `
  ).run(userId);
}

function createUser(username, passwordHash) {
  const result = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, passwordHash);
  return result.lastInsertRowid;
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id);
}

function getOrCreateLocalUser() {
  const existing = getUserByUsername('local');
  if (existing) {
    return getUserById(existing.id);
  }

  const localHash = '$2b$10$2I8Dj5g8VGw2Mbc6B.zm0u6F0dDD3vN4xI2a2HqesV3a3U5c8xG1C';
  const id = createUser('local', localHash);
  return getUserById(id);
}

function listUsers() {
  return db
    .prepare('SELECT id, username, created_at FROM users ORDER BY username ASC')
    .all();
}

function createAuthToken(token, userId) {
  db.prepare('INSERT INTO auth_tokens (token, user_id) VALUES (?, ?)').run(token, userId);
}

function getUserByToken(token) {
  return db
    .prepare(
      `
      SELECT u.id, u.username, u.created_at
      FROM auth_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token = ?
    `
    )
    .get(token);
}

function deleteAuthToken(token) {
  db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);
}

function getSetting(userId, key) {
  const row = db
    .prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?')
    .get(userId, key);
  return row ? row.value : null;
}

function setSetting(userId, key, value) {
  db.prepare(
    `
    INSERT INTO settings (user_id, key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value
  `
  ).run(userId, key, String(value));
}

function insertEvent(userId, event) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events (
      user_id,
      device,
      occurred_at,
      source,
      category,
      duration_minutes,
      sentiment,
      topic,
      identity_hash,
      metadata,
      client_platform,
      app_version,
      os_version,
      external_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    userId,
    event.device || 'unknown',
    event.occurredAt,
    event.source,
    event.category,
    event.durationMinutes,
    event.sentiment,
    event.topic,
    event.identityHash,
    event.metadata || null,
    event.clientPlatform || 'unknown',
    event.appVersion || null,
    event.osVersion || null,
    event.externalId || null
  );

  return result.changes || 0;
}

function insertManyEvents(userId, events) {
  const tx = db.transaction((rows) => {
    let ingested = 0;
    for (const row of rows) {
      ingested += insertEvent(userId, row);
    }
    return {
      ingested,
      skipped: Math.max(0, rows.length - ingested),
    };
  });
  const result = tx(events);
  if ((result.ingested || 0) > 0) {
    invalidateSummaryCacheForUser(userId);
  }
  return result;
}

function deleteAllEvents(userId) {
  db.prepare('DELETE FROM events WHERE user_id = ?').run(userId);
  invalidateSummaryCacheForUser(userId);
}

function reassignUnknownEventsToDevice(userId, targetDevice) {
  const device = typeof targetDevice === 'string' ? targetDevice.trim() : '';
  if (!device || device === 'all' || device === 'unknown') {
    return 0;
  }

  const result = db
    .prepare(
      `
      UPDATE events
      SET device = ?
      WHERE user_id = ?
      AND device = 'unknown'
    `
    )
    .run(device.slice(0, 40), userId);

  if ((result.changes || 0) > 0) {
    invalidateSummaryCacheForUser(userId);
  }

  return result.changes || 0;
}

function getRecentEventSamples(userIds, days, device, limit = 10) {
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(days, 90)) : 7;
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 50)) : 10;
  const safeDevice = typeof device === 'string' && device.trim() && device !== 'all' ? device.trim() : null;
  const validUserIds = Array.isArray(userIds)
    ? userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const hasUserFilter = validUserIds.length > 0;
  const userClause = hasUserFilter
    ? `AND user_id IN (${validUserIds.map(() => '?').join(', ')})`
    : '';
  const deviceClause = safeDevice ? 'AND device = ?' : '';
  const params = [safeDays];
  if (hasUserFilter) {
    params.push(...validUserIds);
  }
  if (safeDevice) {
    params.push(safeDevice);
  }
  params.push(safeLimit);

  return db
    .prepare(
      `
      SELECT occurred_at AS occurredAt, source, category, topic, device, client_platform AS clientPlatform, duration_minutes AS durationMinutes
      FROM events
      WHERE DATETIME(occurred_at) >= DATETIME('now', '-' || ? || ' days')
      ${userClause}
      ${deviceClause}
      ORDER BY DATETIME(occurred_at) DESC
      LIMIT ?
    `
    )
    .all(...params);
}

function exportEvents(userId) {
  return db
    .prepare('SELECT * FROM events WHERE user_id = ? ORDER BY occurred_at DESC')
    .all(userId);
}

function getSummaryForUsers(userIds, days, device) {
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(days, 90)) : 7;
  const safeDevice = typeof device === 'string' && device.trim() && device !== 'all' ? device.trim() : null;
  const validUserIds = Array.isArray(userIds)
    ? userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const hasUserFilter = validUserIds.length > 0;
  const userClause = hasUserFilter
    ? `AND user_id IN (${validUserIds.map(() => '?').join(', ')})`
    : '';
  const baseParams = hasUserFilter ? [safeDays, ...validUserIds] : [safeDays];
  const deviceClause = safeDevice ? 'AND device = ?' : '';
  const deviceParams = safeDevice ? [safeDevice] : [];

  const totals = db
    .prepare(
      `
      SELECT
        COUNT(*) AS totalEvents,
        COALESCE(SUM(duration_minutes), 0) AS totalMinutes,
        COUNT(DISTINCT DATE(occurred_at)) AS activeDays
      FROM events
      WHERE DATETIME(occurred_at) >= DATETIME('now', '-' || ? || ' days')
      ${userClause}
      ${deviceClause}
    `
    )
    .get(...baseParams, ...deviceParams);

  const activeHours = db
    .prepare(
      `
      SELECT
        STRFTIME('%H', occurred_at) AS hour,
        COUNT(*) AS count
      FROM events
      WHERE DATETIME(occurred_at) >= DATETIME('now', '-' || ? || ' days')
      ${userClause}
      ${deviceClause}
      GROUP BY hour
      ORDER BY hour
    `
    )
    .all(...baseParams, ...deviceParams);

  const categoryUsage = db
    .prepare(
      `
      SELECT
        category,
        COALESCE(SUM(duration_minutes), 0) AS minutes
      FROM events
      WHERE DATETIME(occurred_at) >= DATETIME('now', '-' || ? || ' days')
      ${userClause}
      ${deviceClause}
      GROUP BY category
      ORDER BY minutes DESC
    `
    )
    .all(...baseParams, ...deviceParams);

  const sentimentTrend = db
    .prepare(
      `
      SELECT
        DATE(occurred_at) AS date,
        ROUND(AVG(sentiment), 2) AS avgSentiment
      FROM events
      WHERE sentiment IS NOT NULL
      AND DATETIME(occurred_at) >= DATETIME('now', '-' || ? || ' days')
      ${userClause}
      ${deviceClause}
      GROUP BY date
      ORDER BY date
    `
    )
    .all(...baseParams, ...deviceParams);

  const conversationFrequency = db
    .prepare(
      `
      SELECT
        DATE(occurred_at) AS date,
        COUNT(*) AS messages
      FROM events
      WHERE source = 'chat'
      AND DATETIME(occurred_at) >= DATETIME('now', '-' || ? || ' days')
      ${userClause}
      ${deviceClause}
      GROUP BY date
      ORDER BY date
    `
    )
    .all(...baseParams, ...deviceParams);

  const topTopics = db
    .prepare(
      `
      SELECT
        topic,
        COUNT(*) AS count
      FROM events
      WHERE topic IS NOT NULL
      AND topic != ''
      AND DATETIME(occurred_at) >= DATETIME('now', '-' || ? || ' days')
      ${userClause}
      ${deviceClause}
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 5
    `
    )
    .all(...baseParams, ...deviceParams);

  const deviceBreakdown = db
    .prepare(
      `
      SELECT
        device,
        COUNT(*) AS events,
        COALESCE(SUM(duration_minutes), 0) AS minutes
      FROM events
      WHERE DATETIME(occurred_at) >= DATETIME('now', '-' || ? || ' days')
      ${userClause}
      GROUP BY device
      ORDER BY minutes DESC
    `
    )
    .all(...baseParams);

  const platformBreakdown = db
    .prepare(
      `
      SELECT
        client_platform AS platform,
        COUNT(*) AS events,
        COALESCE(SUM(duration_minutes), 0) AS minutes
      FROM events
      WHERE DATETIME(occurred_at) >= DATETIME('now', '-' || ? || ' days')
      ${userClause}
      ${deviceClause}
      GROUP BY client_platform
      ORDER BY minutes DESC
    `
    )
    .all(...baseParams, ...deviceParams);

  return {
    totals,
    selectedDevice: safeDevice || 'all',
    activeHours,
    categoryUsage,
    sentimentTrend,
    conversationFrequency,
    topTopics,
    deviceBreakdown,
    platformBreakdown,
  };
}

function getSummary(userId, days, device) {
  return getSummaryForUsers([userId], days, device);
}

function getGlobalSummary(days, device) {
  return getSummaryForUsers([], days, device);
}

module.exports = {
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
  insertEvent,
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
  invalidateSummaryCacheForUser,
  getRecentEventSamples,
};
