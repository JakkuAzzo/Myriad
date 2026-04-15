# Myriad

Myriad is a local-first, privacy-preserving mindful behavior-change system built for Said Osman's FYP.

It collects and summarizes chat and browsing activity across devices, then presents analytics and intervention guidance while keeping data on the local machine.

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
- Habit-change goal management:
  - set per-category max daily minutes
  - target specific devices or all devices
  - define intervention plans to help stop unwanted habits
- Intervention planner with actionable prompts based on recent usage patterns
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

### 2. Configure anonymization salt

For real usage, always set a strong anonymization salt:

```bash
export MYRIAD_SALT="replace-with-a-long-random-secret"
```

Strict mode behavior:

- In `production`, Myriad now requires `MYRIAD_SALT` and will fail startup if it is missing.
- You can also enforce this in non-production with `MYRIAD_REQUIRE_STRONG_SALT=true`.

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
- `npm run test:e2e` - run Playwright end-to-end UI assertions (seed, goals, consent, deletion)
- `npm run test:all` - run unit/integration + E2E
- `npm run usability:report` - generate reproducible usability metrics summary
- `npm run check:ios-project` - verify complete iOS project files are present
- `npm run test:ios` - run iOS XCTest/UI tests (macOS + complete iOS project required)

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

Run end-to-end browser tests:

```bash
npm run test:e2e
```

Run full local matrix:

```bash
npm run test:all
```

## Usability Validation Artifacts

Reproducible usability assets are in `artifacts/usability/`:

- `results-template.csv` includes task-time + SUS schema
- `README.md` defines protocol and analysis flow

Generate a summary report:

```bash
npm run usability:report
```

## Architecture Alignment Note

The implemented MVP architecture in this repository is local Node.js + Express + SQLite.

See `artifacts/dissertation-architecture-reconciliation.md` for wording to align dissertation claims with the reproducible implementation while preserving future extensibility.

## iOS Build Integrity

To prevent silent iOS breakage, CI includes iOS project presence checks and iOS test execution on macOS runners.

If `MyriadIOS.xcodeproj/project.pbxproj` is missing from source control, `npm run check:ios-project` fails with a clear remediation message.

## Privacy model

- Local-first by design: data stays on-device in SQLite
- No remote analytics or cloud sync in this MVP
- User consent can disable event collection at runtime
