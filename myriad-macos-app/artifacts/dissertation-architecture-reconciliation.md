# Dissertation Architecture Reconciliation

## Why this addendum exists

Early dissertation drafts described a local Splunk pipeline. The implemented Myriad MVP in this repository uses a local Node.js + Express + SQLite analytics stack.

## Current implemented architecture (verified)

- Ingestion/API: Express server (`src/server.js`)
- Storage: local SQLite (`src/db.js`)
- Desktop shell: Electron (`electron/main.js`)
- Analytics/dashboard: computed summaries + charts (`public/stats.js`)
- Privacy controls: consent toggle, export, deletion, pseudonymization (`src/anonymize.js`)

## Recommended dissertation wording update

Replace references that imply Splunk is currently implemented with:

"Myriad uses a local-first analytics pipeline implemented with Node.js, Electron, and SQLite in the MVP. The architecture preserves on-device processing and privacy controls while remaining extensible to future external analytics backends such as Splunk if required."

## Rationale

- Aligns claims with reproducible implementation.
- Preserves original privacy and mindful-usage aims.
- Keeps Splunk as a future extension rather than a current dependency.
