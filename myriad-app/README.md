# Myriad - Mindful Habit Tracker

A local-first, privacy-preserving analytics app for Said Osman's FYP.

## What this MVP includes

- Local profile authentication and multi-user data isolation
- Local event ingestion API for chat/browser habits
- Real import connectors:
  - WhatsApp TXT export parser
  - Telegram JSON export parser
  - Browser history JSON/CSV importer
- Pseudonymisation using salted SHA-256 hashes
- Local SQLite storage only (no cloud dependency)
- Consent toggle to enable/disable data collection
- Data controls: export and delete all data
- Dedicated statistics page (`/stats`) with dashboard analytics:
  - active hours
  - category usage
  - sentiment trend
  - chat frequency
  - top topics
- Automated tests for API and anonymisation behavior

## Quick start (Electron app)

1. Install dependencies:

```bash
npm install
```

2. (Optional) set a custom anonymisation salt:

```bash
export MYRIAD_SALT="replace-with-long-random-secret"
```

3. Run the desktop app:

```bash
npm start
```

4. The Electron window opens Myriad automatically.

## Run in browser-only mode

```bash
npm run start:web
```

Open:

```text
http://localhost:3000
```

After browser import on the home page, Myriad opens statistics automatically.

Direct statistics URL:

```text
http://localhost:3000/stats
```

## Run tests

```bash
npm test
```

## API summary

- `GET /api/health`
- `POST /api/auth/register` body: `{ "username": "said", "password": "password123" }`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `POST /api/auth/logout` (Bearer token)
- `GET /api/users` (Bearer token)
- `GET /api/consent` (Bearer token)
- `POST /api/consent` body: `{ "enabled": true|false }` (Bearer token)
- `POST /api/events` body: event or `{ "events": [ ... ] }` (Bearer token)
- `POST /api/events/sample-seed` (Bearer token)
- `POST /api/import/whatsapp` body: `{ "text": "..." }` (Bearer token)
- `POST /api/import/telegram` body: `{ "json": "..." }` or JSON object (Bearer token)
- `POST /api/import/browser-history` body: `{ "text": "..." }` (Bearer token)
- `POST /api/import/upload?connector=whatsapp|telegram|browser-history` form-data file field `file`
- `GET /api/summary?days=7` (Bearer token)
- `GET /api/events/export` (Bearer token)
- `DELETE /api/events` (Bearer token)

## Event payload shape

```json
{
  "occurredAt": "2026-03-10T12:00:00.000Z",
  "source": "chat",
  "category": "social",
  "durationMinutes": 10,
  "sentiment": 0.15,
  "topic": "friends",
  "identifier": "raw-user-id-or-handle"
}
```

`identifier` is never stored directly; only a hashed value is persisted.
