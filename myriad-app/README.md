# Myriad

Myriad is a local-first, privacy-preserving mindful habit tracker built for Said Osman's FYP.

It collects and summarizes chat and browsing activity, then presents analytics in a desktop-friendly dashboard while keeping data on the local machine.

## Key features

- Local account system with per-user data separation
- Consent-based data collection (on/off per user)
- Event ingestion API for chat and browser usage
- Import connectors for:
  - WhatsApp text exports
  - Telegram JSON exports
  - Browser history JSON/CSV
- Pseudonymization of identifiers using salted SHA-256 hashing
- Local SQLite storage only (no cloud dependency)
- Export and deletion endpoints for user data control
- Dashboard statistics page with:
  - active hours
  - category distribution
  - sentiment trend
  - chat frequency
  - top topics
- Automated tests for API and anonymization logic

## Tech stack

- Node.js + Express
- Electron (desktop shell)
- SQLite via better-sqlite3
- bcryptjs for password hashing

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Optional: set anonymization salt

If not set, the app falls back to a development default. For real usage, use a strong secret.

```bash
export MYRIAD_SALT="replace-with-a-long-random-secret"
```

### 3. Run the app

Desktop mode (Electron):

```bash
npm start
```

Web mode (Express only):

```bash
npm run start:web
```

Then open `http://localhost:3000`.

## Available scripts

- `npm start` - rebuild native module for Electron and launch desktop app
- `npm run start:web` - start Express server in browser mode
- `npm run dev` - same as web mode
- `npm test` - rebuild native module for Node and run tests

## Project structure

```text
myriad-app/
  data/                SQLite database files
  electron/            Electron main and preload scripts
  public/              Frontend pages and static assets
  src/                 Server, DB access, connectors, anonymization
  test/                Node test suites
```

## API overview

### Health

- `GET /api/health`

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `POST /api/auth/logout` (Bearer token)
- `GET /api/users` (Bearer token)

### Consent

- `GET /api/consent` (Bearer token)
- `POST /api/consent` with `{ "enabled": true | false }` (Bearer token)

### Events

- `POST /api/events` with one event or `{ "events": [...] }` (Bearer token)
- `POST /api/events/sample-seed` (Bearer token)
- `GET /api/summary?days=7` (Bearer token)
- `GET /api/events/export` (Bearer token)
- `DELETE /api/events` (Bearer token)

### Imports

- `POST /api/import/whatsapp` with `{ "text": "..." }`
- `POST /api/import/telegram` with `{ "json": "..." }` or JSON object
- `POST /api/import/browser-history` with `{ "text": "..." }`
- `POST /api/import/upload?connector=whatsapp|telegram|browser-history` as multipart form-data (file field: `file`)

## Event payload example

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

Notes:

- `source` is normalized to `chat` or `browser`
- `durationMinutes` is rounded to a non-negative integer
- `identifier` is never stored directly; only its salted hash is persisted

## Testing

Run the full test suite:

```bash
npm test
```

## Privacy model

- Local-first by design: data stays on-device in SQLite
- No remote analytics or cloud sync in this MVP
- User consent can disable event collection at runtime
