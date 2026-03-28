---
title: "Myriad: A Local-First, Privacy-Preserving Mindful Habit Tracker"
author: "Said Osman"
date: "March 2026"
---

# FACULTY OF SCIENCE, ENGINEERING AND COMPUTING

## School of Computer Science and Mathematics

### BSc (Hons) Degree in Cyber Security

**Project Title:** Myriad: A Local-First, Privacy-Preserving Mindful Habit Tracker  
**Student Name:** Said Osman  
**KU ID:** [Insert KU ID]  
**Supervisor:** Dr Deepak GC  
**Date of Submission:** March 2026

\newpage

# Declaration

The author has read and understood the University regulations on plagiarism and understands the meaning of plagiarism. This dissertation is the author’s own work. Any other sources are duly acknowledged and referenced according to the requirements of the School of Computer Science and Mathematics. All verbatim citations are indicated by quotation marks. No part of another student’s work has been presented as original work. No unauthorised assistance has been used in producing this report in the form of code, text or drawings.

**Date:** March 2026  
**Name:** Said Osman  
**Signature:** __________________________

\newpage

# Table of Contents

1. Introduction and Background  
2. Project Management Strategy  
3. Literature Review  
4. Methodology  
5. Implementation of Artefact  
6. Critical Review  
7. References  
8. Appendices

\newpage

# Table of Figures

- Figure 1: Myriad high-level architecture  
- Figure 2: Event ingestion and privacy-preserving transformation pipeline  
- Figure 3: Summary analytics and enhanced insight generation flow  
- Figure 4: Dashboard capability map

\newpage

# Glossary of Terms

| Term | Meaning |
|---|---|
| API | Application Programming Interface |
| CSV | Comma-Separated Values |
| GDPR | General Data Protection Regulation |
| LLM | Large Language Model |
| MVP | Minimum Viable Product |
| ONNX | Open Neural Network Exchange |
| PII | Personally Identifiable Information |
| SHA-256 | Secure Hash Algorithm 256-bit digest |
| SQL | Structured Query Language |
| WAL | Write-Ahead Logging |

\newpage

# 1. Introduction and Background

Digital wellbeing systems have become increasingly visible across consumer platforms, yet most deployed products continue to depend on cloud-centric telemetry collection. This model can conflict with modern expectations of data minimisation and user control, particularly when behavioural traces include communication patterns, browsing interests and inferred sentiment. A substantial share of wellbeing and productivity applications rely on remote analytics pipelines that centralise sensitive data, creating legal and ethical pressure around retention, secondary processing and cross-border transfer. Within a cyber security context, this creates a design challenge: useful behaviour analytics should be produced without exposing raw behavioural data to external services.

The project addresses this challenge through Myriad, a local-first mindful habit tracker designed and implemented as a desktop-focused artefact. The solution was developed to collect selected personal activity signals from chat and browser exports, pseudonymise identity-linked fields, store records locally in SQLite and provide trend analytics through a local dashboard. The architectural objective was not only functional delivery, but also demonstrable alignment with privacy-by-design principles and practical user data controls.

From an engineering-security perspective, this challenge can be reframed as a balance between observability and confidentiality. Greater observability commonly requires broader telemetry collection, but broader collection can increase data exposure risk. If these records are remote, additional threat vectors emerge through central storage compromise, account takeover, weak retention controls or policy changes in external services. The project therefore treated attack-surface reduction as an architectural baseline rather than an afterthought.

The threat context relevant to this artefact includes unauthorised data access, identity inference from metadata and accidental over-collection. Even when full message content is absent, behavioural metadata can reveal personal patterns such as social rhythms, working periods and high-interest topics. Myriad mitigates these concerns through local-only persistence, pseudonymised identifiers, bounded metadata fields and direct user controls over collection and deletion.

The scale of the problem is significant. Behavioural data in ordinary digital life is high-volume and continuous, and even seemingly trivial records can become personally revealing when linked over time. Message metadata, browsing labels, topic keywords and interaction time windows can all contribute to re-identification risk. A system that stores this information remotely can increase exposure to account compromise, service misuse, insider abuse or policy drift in data processing. For student-level software engineering and cyber security practice, a local-first model offers a practical route to reducing attack surface while maintaining analytical utility.

Key stakeholders include: the primary end user (who requires meaningful insight and privacy protection), higher education assessors (who require technical and methodological rigour), and future developers or maintainers (who require a readable, testable and extensible implementation). Additional stakeholders include organisations interested in privacy-first analytics prototypes, where local intelligence processing may be preferable to cloud ingestion in regulated settings.

The project aims were defined as follows:

1. To design and implement a local-first activity tracking system that preserves user privacy while producing useful behavioural summaries.
2. To establish a clear consent model and user data lifecycle controls (collection toggle, export, deletion).
3. To validate the system through automated tests and representative ingestion scenarios.
4. To demonstrate extensibility for enhanced analytics through an offline-capable AI summary layer.

The objectives that operationalised these aims were:

1. Build a desktop application architecture using Electron, Express and SQLite.
2. Implement per-user account separation with token-based session handling.
3. Add ingestion APIs for direct event capture and import connectors for WhatsApp, Telegram and browser history.
4. Ensure identifier pseudonymisation via salted SHA-256 hashing.
5. Implement summary endpoints with temporal and device filtering.
6. Provide dashboard visualisations for activity totals, category distribution, sentiment trend, conversation frequency, top topics, and platform/device breakdown.
7. Add data export and irreversible delete endpoints.
8. Implement enhanced summary generation with a heuristic fallback and optional ONNX provider.
9. Provide automated tests covering security-relevant and correctness-critical behaviour.

Project scope focused on local analytics and privacy-preserving processing, not enterprise deployment. The artefact intentionally excluded cloud synchronisation, large-scale multi-tenant architecture, and production mobile telemetry agents. This boundary reduced implementation risk and aligned with available project time. The system is therefore positioned as a robust MVP and proof-of-concept rather than a full commercial product.

Legal, social and ethical implications were considered from project inception. The design avoids raw identifier persistence for imported and ingested events, minimises external transmission, and allows user withdrawal from data collection. The solution is compatible with GDPR principles of minimisation, purpose limitation and user control, although formal legal certification is out of scope for this project. No human subject experimentation requiring university ethics submission was performed during implementation; all development and testing used synthetic or user-controlled local data.

Social implications were considered in relation to interpretation risk. Behaviour dashboards can support reflective habit improvement, but can also be misunderstood as normative scoring systems. For this reason, the dashboard and enhanced summary features were designed to remain descriptive rather than judgemental, with explicit warning fields in generated narrative outputs.

Ethically, the project adopted proportionality in data handling: retain only the fields necessary for aggregate insight. This principle influenced event schema design, connector conversion logic, and export/delete functionality. These controls do not constitute legal certification, but they provide concrete operational behaviour consistent with privacy-by-design expectations.

\newpage

# 2. Project Management Strategy

The project was managed using a phased, milestone-oriented approach that combined iterative software increments with periodic evaluation checkpoints. Given the module weighting and the requirement for both artefact and dissertation quality, management strategy prioritised early core implementation, followed by stabilisation, testing and documentation.

## 2.1 Management Tools and Techniques

The principal techniques used were:

1. Milestone decomposition into architecture, ingestion, analytics, privacy controls, enhancement and validation phases.
2. Weekly backlog review with explicit prioritisation of security-critical tasks.
3. Incremental integration, where each feature was validated against current API behaviour before extension.
4. Automated testing as a release gate for core API paths.
5. Lightweight risk tracking with mitigation actions linked to each technical uncertainty.

The technical toolset consisted of Node.js package scripts, local Git versioning, and test automation via Node’s built-in test runner with Supertest. This approach was selected because it reduced tool overhead and preserved focus on engineering and analysis outcomes.

Implementation sequencing followed dependency order. User identity boundaries and authentication were completed before aggregate analytics to avoid redesigning summary queries. Migration checks were implemented before introducing additional event dimensions (`client_platform`, `app_version`, `os_version`, `external_id`). This sequencing reduced rework and improved confidence in later-stage feature additions.

## 2.2 Alternative Approaches Considered

Alternative approaches included Kanban tooling (for example Trello), Scrum-style sprint ceremonies and separate issue-tracking workflows. These options can improve visibility in team settings, but for a single-student project with constrained timeline they introduce process overhead without equivalent productivity gain. The final strategy therefore used a compact hybrid model: milestone planning plus iterative implementation and periodic review.

## 2.3 Work Plan and Milestones

| Phase | Activities | Deliverables | Indicative Outcome |
|---|---|---|---|
| Phase 1: Requirements and Architecture | Define problem, scope, privacy objectives, stack selection | Architecture baseline | Local-first model and module boundaries approved |
| Phase 2: Core Platform | User model, auth token handling, settings and events schema | Running API with persistence | Multi-user local system operational |
| Phase 3: Data Ingestion | Event endpoints and import connectors | WhatsApp, Telegram, browser ingestion | Input interoperability demonstrated |
| Phase 4: Analytics | Summary queries, dashboard charts, filters | Statistical views and trend endpoints | Behaviour insights available |
| Phase 5: Privacy Controls | Consent toggle, pseudonymisation, export/delete operations | User data lifecycle controls | Privacy posture strengthened |
| Phase 6: Enhanced Insights | AI summary pipeline, cache strategy, fallback behaviour | Enhanced summary endpoint | Narrative insights generated locally/fallback |
| Phase 7: Validation and Documentation | Automated tests, report writing, final review | Tested artefact and dissertation | Submission-ready project |

## 2.4 Risk Management

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Identifier leakage through raw imports | Medium | High | Hash identifiers via salted SHA-256 before persistence |
| Duplicate event ingestion in batch mode | Medium | Medium | Enforce uniqueness for `(user_id, external_id)` when present |
| Data contamination across users | Low | High | Enforce `user_id` in all event operations and summaries |
| Over-reliance on external AI runtime | Medium | Medium | Provide deterministic heuristic fallback provider |
| Performance degradation on repeated summary calls | Medium | Medium | Introduce summary cache with expiry and invalidation |
| Loss of user trust due to opaque processing | Medium | High | Provide export and delete endpoints; visible consent toggle |

The project management strategy was effective because technical risk treatment was embedded in implementation rather than postponed to final review. This reduced rework during later stages and allowed testing to verify high-risk controls early.

A management lesson from the development cycle is that dissertation writing should begin once architecture stabilises, rather than after all coding concludes. Early documentation of design rationale reduced recall loss and improved consistency between implementation details and written analysis.

\newpage

# 3. Literature Review

The literature review focused on four categories that directly informed Myriad’s design: (1) local-first software principles, (2) privacy-preserving analytics practices, (3) desktop application architecture patterns, and (4) lightweight AI summarisation for personal analytics.

## 3.1 Systems and Techniques Reviewed

### 3.1.1 Local-First and Edge-Oriented Processing

Local-first systems prioritise user ownership and availability by keeping primary data on-device and synchronising only when strictly required. For wellbeing analytics, this model reduces dependence on remote trust assumptions and can materially shrink attack surface. The reviewed technical implication is that architecture must support robust local persistence, deterministic query behaviour and explicit export controls.

### 3.1.2 Privacy-Preserving Identity Handling

Pseudonymisation and minimisation are central to protecting behavioural telemetry. Salted hashing of identifiers lowers direct re-identification risk when records are stored or exported. However, pseudonymisation alone is not equivalent to anonymisation; linkage attacks can remain possible if auxiliary context is rich. Therefore, technical design should combine hashing with scope limits, retention control and user deletion mechanisms.

### 3.1.3 Desktop Delivery via Electron with Local API

Electron provides cross-platform desktop delivery with web-compatible UI development. Coupling Electron shell components with a local Express API can accelerate implementation and maintain clear service boundaries. The limitation is runtime footprint and dependency complexity, particularly around native modules such as SQLite bindings.

### 3.1.4 Lightweight Local AI Summarisation

Analytics narration through compact model workflows can improve user interpretability. Yet model runtime reliability, prompt safety and deterministic output formatting are common concerns. A robust pattern is dual-mode operation: optional model inference and guaranteed fallback heuristics. This ensures availability and avoids hard dependency on model downloads or GPU features.

The review identified an additional quality concern: generated text may appear authoritative even when evidence is weak. To reduce this risk, Myriad constrains generation context to quantified summaries and redacted sample lines, and returns warnings with confidence classification. The approach favours transparent limitations over persuasive but potentially misleading language.

Prompt privacy risk was also considered. Model input that contains direct contact information can lead to unwanted reproduction in generated output. The implementation addresses this through pre-generation redaction of common email, phone and URL patterns before prompt assembly.

## 3.2 Comparative Analysis

| Technique / System Choice | Benefits | Limitations | Relevance to Myriad |
|---|---|---|---|
| Local-first persistence (SQLite) | Data residency on device, low latency, no cloud dependency | Single-device scope in MVP, manual backup burden | Core design principle for privacy and control |
| Salted SHA-256 pseudonymisation | Strong deterministic transform, low overhead | Not full anonymisation if contextual linkage exists | Used for identifier protection in event storage |
| Electron + Express architecture | Rapid desktop delivery, clear API boundary, reusable web stack | Larger binary/runtime footprint | Enabled fast implementation and extensibility |
| Consent-based collection control | User autonomy, alignment with GDPR principles | Requires UI clarity and user understanding | Implemented via per-user setting and API gate |
| Export and delete lifecycle controls | Transparency and reversibility | Deletion is irreversible; requires user confirmation | Implemented for data rights and trust |
| AI summarisation with fallback | Improved insight readability; resilience under model failure | Potential output variance; prompt engineering needed | Implemented with ONNX option and heuristic provider |

## 3.3 Review Outcome and Project Focus

The review indicated that a strong project contribution could be achieved by combining practical engineering with privacy-by-design controls in an end-to-end artefact. Rather than attempting broad cloud-scale capability, the project focused on local behavioural analytics with demonstrable governance features. This focus aligns with the broader problem introduced earlier: how meaningful activity insight can be generated while reducing unnecessary exposure of personal data.

## 3.4 Alignment with Research Purpose

The selected design direction supports the research purpose by operationalising cyber security principles directly in software behaviour. The project does not merely discuss privacy-preserving analytics conceptually; it implements and validates concrete controls across ingestion, storage, retrieval and reporting. This practical orientation strengthens the project’s academic value and supports future extension into larger privacy-preserving ecosystems.

The contribution is therefore methodological as well as technical: it demonstrates a replicable pattern for privacy-aware personal analytics at undergraduate project scale. The pattern combines local data residency, pseudonymisation before storage, explicit user lifecycle controls, and verification through automated endpoint tests.

## 3.5 Critical Comparison with Alternative Architectures

An alternative architecture considered during review was a cloud-backed telemetry pipeline with central authentication, remote storage and managed analytics. Such an approach can simplify multi-device synchronisation and potentially improve long-term observability across user populations. However, for a privacy-sensitive student project, it also introduces substantial governance and operational burdens: secure hosting, incident response readiness, key management, retention policy enforcement, and stricter legal accountability for personal data processing.

Another possible architecture was a direct native mobile implementation first, with desktop dashboarding as a secondary phase. This may provide richer first-party event capture and mobile-centric usability. Nevertheless, mobile-first delivery typically adds provisioning complexity, stricter platform review constraints, and broader testing matrix requirements across OS versions and device capabilities. In a limited timeframe, this can reduce confidence in core security controls if engineering effort is consumed by platform orchestration tasks.

A third option was use of a remote AI summarisation API for narrative generation. This could improve output quality in some contexts but conflicts with data-locality priorities, because summary context would need to leave the local environment. Even if payloads were reduced, inference prompts can still carry sensitive behavioural traces. For this reason, the project selected an offline-first summarisation strategy with local heuristics and optional on-device ONNX runtime path.

The comparative conclusion is that the chosen architecture optimises for privacy, reproducibility and scope realism. It deliberately trades off cloud convenience and broad distribution reach in exchange for stronger local data control and clearer security reasoning. Given the module’s emphasis on technical competence and critical analysis, this trade-off is justified and academically defensible.

\newpage

# 4. Methodology

The methodology combined proof-of-concept engineering with empirical verification. The project intended to create a complete local software artefact that could ingest user activity data, transform sensitive fields, persist events safely, and produce interpretable analytics for personal and aggregated views.

## 4.1 Intended Deliverables

The core deliverables were:

1. Executable desktop application with local backend.
2. Structured database schema with migration-safe evolution.
3. Event ingestion API and file import connectors.
4. Privacy controls (consent, pseudonymisation, export and delete).
5. Dashboard analytics and enhanced summary generation.
6. Automated test suite demonstrating correctness and control integrity.

## 4.2 Influence of Literature Outcomes

Literature findings directly shaped methodological decisions:

1. Local-first persistence was chosen to satisfy privacy and control priorities.
2. Pseudonymisation was applied to identifiers before database insertion.
3. Consent and data lifecycle controls were treated as first-class API behaviour.
4. AI summarisation was implemented in a resilient pattern with deterministic fallback.

## 4.3 Hardware Environment

Development and validation were performed on Apple Silicon macOS hardware suitable for desktop and local API execution. The hardware class provided sufficient performance for SQLite transactions, chart rendering and optional ONNX runtime tests.

## 4.4 Software Environment and Specifications

| Component | Specification / Role |
|---|---|
| Runtime | Node.js |
| Backend | Express 5.x |
| Desktop shell | Electron 40.x |
| Database | SQLite via better-sqlite3 12.x |
| Password security | bcryptjs |
| File ingestion | multer |
| API testing | Supertest with Node test runner |
| Optional AI summarisation | @xenova/transformers (ONNX pipeline) |

## 4.5 Data Model and Processing Method

The methodology for data handling followed a defined sequence:

1. Receive raw event or import payload.
2. Normalise event schema fields (`source`, `durationMinutes`, timestamps, platform labels).
3. Apply salted SHA-256 hashing to identifier values.
4. Persist transformed records in local SQLite under the active user scope.
5. Serve aggregate analytics through summary endpoints with optional filters.
6. Generate enhanced narrative summary and cache result with expiry.

This sequence ensures that privacy transformations occur before durable storage, reducing exposure of raw identity-linked inputs.

The schema and query strategy were designed for explainability and maintainability. Analytical dimensions such as category, platform and duration are represented in explicit columns, enabling transparent SQL aggregation and straightforward test assertions. This avoids opaque processing paths and supports future extension.

A partial unique index on `(user_id, external_id)` was used to enforce idempotent ingestion for externally sourced events. This is particularly relevant when upstream clients retry delivery. Without this constraint, duplicate rows would distort aggregate metrics and reduce trust in reported outcomes.

Enhanced summary caching uses deterministic key derivation from scope, user, days and device filter. Cache invalidation occurs after event mutation, while stale entries expire via time-to-live policy. This strategy improves dashboard responsiveness while preserving output freshness.

## 4.6 Validation Method

Validation combined unit and API integration tests. Test cases covered deterministic anonymisation, authentication, user data isolation, connector imports, idempotent batch ingestion, device reassignment, global summary authorisation and enhanced summary response structure. A full test execution reported 10 passing tests with zero failures.

Validation goals were split into two categories. Functional goals checked correctness of endpoint behaviour and payload shape. Control goals checked privacy and authorisation boundaries, such as rejection of unauthorised global summary requests and persistence of transformed identifiers. This distinction helped ensure that security-relevant behaviour was tested explicitly rather than assumed through general functionality.

## 4.7 Figure 1: Myriad High-Level Architecture

The implemented architecture can be summarised as follows:

- Desktop/UI layer (Electron and browser-based pages) invokes local API endpoints.
- Express service performs validation, consent checks and event sanitisation.
- Privacy transformation module hashes identifiers with salt.
- SQLite persistence stores user-scoped records and summary cache entries.
- Analytics module computes aggregate metrics.
- Enhanced summary module produces narrative outputs via heuristic or ONNX path.

## 4.8 Figure 2: Event Ingestion and Privacy Pipeline

- Input channels: direct API events, WhatsApp text export, Telegram JSON export, browser history JSON/CSV.
- Connector parsing converts source formats into normalised event objects.
- Sanitisation enforces field bounds and canonical values.
- Identifier pseudonymisation is applied before insertion.
- Records are committed transactionally and become available for summary endpoints.

## 4.9 Figure 3: Enhanced Insight Flow

- Base summary is calculated from persisted events.
- Context is redacted and transformed into prompt-safe structure.
- Selected provider (heuristic fallback or ONNX) generates narrative and highlights.
- Output is cached by scope, user/device filters and window size.
- Cache invalidates on event mutations and expires via TTL.

## 4.10 Evaluation Metrics and Reproducibility Approach

The project used practical engineering metrics to evaluate artefact quality. These were selected to be observable within local development constraints and directly related to user-facing reliability.

1. **Functional completion:** Presence of required endpoint categories (authentication, consent, ingestion, summary, export/delete, enhanced insight).
2. **Privacy control enforcement:** Correct rejection or transformation behaviour in tested privacy-relevant scenarios.
3. **Data isolation correctness:** No cross-user event contamination in summary responses.
4. **Determinism in key transformations:** Stable hash output under constant salt and input.
5. **Operational responsiveness:** Acceptable local execution latency for summary operations and test runtime.

Reproducibility was supported by explicit npm scripts and test automation. A reviewer can install dependencies, run tests and observe equivalent endpoint behaviour without external services. This is a significant methodological advantage of local-first implementation: environmental variance is reduced because no remote infrastructure setup is required for baseline validation.

The project also considered negative-space evaluation, meaning what the system should not do. For example, it should not ingest when consent is disabled, should not provide global summary without administrative proof, and should not store raw identifiers where pseudonymisation applies. Validation of these non-goals is important because privacy and security quality often depends as much on prohibited behaviour as on enabled functionality.

\newpage

# 5. Implementation of Artefact

## 5.1 Intended Audience

This implementation section is written for technical readers with undergraduate-level computing knowledge, including assessors, developers and cyber security students who may wish to reproduce or extend the system.

## 5.2 Recreating the Implementation

### 5.2.1 Setup

1. Install Node.js and npm in a local development environment.
2. Install project dependencies with `npm install`.
3. Optionally set `MYRIAD_SALT` to a strong random value.
4. Start desktop mode with `npm start` or API/web mode with `npm run start:web`.

### 5.2.2 Core Backend Construction

The backend implementation resides in a modular structure:

- `src/server.js` provides routing, request handling, consent gating and endpoint orchestration.
- `src/db.js` defines schema creation, migration checks, indexing and query functions.
- `src/anonymize.js` encapsulates salted SHA-256 pseudonymisation.
- `src/connectors.js` parses WhatsApp, Telegram and browser history exports.
- `src/llm.js` implements enhanced summary generation with provider abstraction.

The database schema includes users, auth tokens, settings, events and summary cache. Migration-aware logic checks for legacy column absence and applies controlled `ALTER TABLE` operations where needed. Indexed columns support efficient summary and filter operations.

Backward compatibility was treated as an implementation requirement. The settings table migration path accounts for older key-value layouts and reconstructs them into user-scoped records. Event table migration similarly adds missing columns only when absent, reducing upgrade risk in existing local databases.

### 5.2.3 Security-Relevant Implementation Details

1. **Credential Handling:** Passwords are hashed with bcrypt before persistence.
2. **Session Handling:** Auth tokens are generated locally and mapped to user IDs.
3. **Consent Enforcement:** Event ingestion endpoints deny collection when user consent is disabled.
4. **Admin Boundary:** Global summary mode requires `x-myriad-admin-key`.
5. **Identifier Protection:** Raw identifiers are transformed to salted SHA-256 digests.
6. **Input Normalisation:** Event fields are bounded and sanitised to reduce malformed data risk.

Further implementation safeguards include client-platform normalisation, timestamp repair for invalid date values, and bounded metadata length controls to reduce storage abuse opportunities.

## 5.3 Using the Artefact and Generating Output

### 5.3.1 Data Ingestion Paths

The system supports three practical ingestion modes:

1. Direct event submission (`POST /api/events` and `POST /api/events/batch`).
2. Connector imports for WhatsApp, Telegram and browser history.
3. File upload import endpoint with connector selection.

### 5.3.2 Analytics and Dashboard Output

The dashboard provides:

1. Total events, total minutes and active day counters.
2. Active-hour distribution chart.
3. Category usage chart by minutes.
4. Sentiment trend and chat frequency charts.
5. Top topic list.
6. Device and platform breakdown.
7. Enhanced AI-assisted narrative highlights.

Operationally, this enables comparative self-analysis. The user can move between time windows and device filters, then observe how workload distribution, communication intensity and topic concentration vary under each lens.

### 5.3.3 Example Output Structure

A representative summary response includes:

- `totals`: aggregate counts and durations.
- `activeHours`, `categoryUsage`, `sentimentTrend`, `conversationFrequency`.
- `topTopics`, `deviceBreakdown`, `platformBreakdown`.
- `selectedDevice` reflecting active filter.

Enhanced summary output adds:

- `aiSummary.narrative` and `aiSummary.highlights`.
- `aiSummary.provider`, `aiSummary.model`, confidence and warnings.
- Cache metadata (`hit`, key, expiry) for traceability.

## 5.4 Test and Validation Results

Automated tests were executed via `npm test` and produced the following verified outcomes:

1. Deterministic anonymisation for repeated input under fixed salt.
2. Correct null handling for invalid identifier inputs.
3. Successful register/login/authenticated profile flow.
4. Strict event separation between users.
5. Successful connector imports and non-persistence of raw tested identifiers.
6. Correct unknown-device reassignment behaviour.
7. Idempotent batch ingestion using external event identifiers.
8. Proper admin enforcement for global summary endpoint.
9. Enhanced summary payload correctness and cache hit behaviour.
10. ONNX provider mode compatibility with expected payload shape.

All 10 tests passed with zero failures in the final recorded execution.

The recorded suite duration was approximately two seconds, allowing frequent execution during iterative development. Fast feedback is important in privacy-sensitive software, where regressions should be detected quickly after changes.

## 5.5 Figure 4: Dashboard Capability Map

Dashboard controls and capabilities include:

- Day-window selection (for example 7/30 day analysis).
- Device filter selection.
- Scope selection (personal/global with admin key requirement).
- Consent toggle for collection enable/disable.
- Export and full delete controls.
- Unknown-device reassignment utility.

## 5.6 Implementation Conclusion

The implementation achieved the intended MVP goals: local-first behaviour tracking, privacy-preserving transformation, accountable data controls, and interpretable analytics. Engineering decisions remained consistent with project aims and module expectations for technical depth and practical validation.

## 5.7 Detailed Endpoint Walkthrough for Reproduction

The following walkthrough provides a concrete sequence that can be used to reproduce major artefact features in an assessor environment.

1. **Register a profile** using `POST /api/auth/register` with username and password.
2. **Authenticate** using `POST /api/auth/login` and retain the returned bearer token.
3. **Check consent state** with `GET /api/consent`; if needed, update using `POST /api/consent`.
4. **Ingest a small event batch** through `POST /api/events/batch` including `externalId` fields to test idempotency.
5. **Import a connector payload** using one of the import endpoints to validate parser behaviour.
6. **Request personal summary** with `GET /api/summary?days=7&device=all`.
7. **Request enhanced summary** with `GET /api/summary/enhanced?scope=personal&days=7&device=all` and observe cache fields.
8. **Re-run enhanced request** and verify cache hit behaviour.
9. **Export records** with `GET /api/events/export` and inspect transformed identifier fields.
10. **Delete records** with `DELETE /api/events` and verify summary totals reset.

This sequence exercises authentication, ingestion, privacy controls, analytical processing, enhanced narrative generation and lifecycle management. It is suitable as a practical demonstration script during viva preparation.

A separate administrative flow can be demonstrated by providing `x-myriad-admin-key` and calling `GET /api/summary/global`. This verifies that aggregate cross-user analytics are intentionally gated and unavailable to ordinary authenticated users.

The implementation also supports device-normalisation and reassignment for unknown records. This behaviour can be tested by ingesting events with unspecified device labels, then using `POST /api/events/reassign-unknown-device` to migrate those events into a chosen device category. The resulting summary shift validates both data maintenance tooling and aggregate-query integrity.

\newpage

# 6. Critical Review

## 6.1 Review of Outcomes Against Aims and Objectives

The project successfully delivered a functioning local-first mindful habit tracker with privacy-preserving processing and analytics output. Core aims relating to data locality, pseudonymisation and user control were met in implemented endpoints and validated behaviour. Objectives for connector ingestion, summary generation, dashboard visualisation and test coverage were also achieved.

The solution demonstrates practical cyber security value by reducing external exposure pathways. Importantly, privacy controls are integrated in ordinary workflow rather than treated as optional extensions. This improves credibility of privacy-by-design claims.

When measured against module expectations, the project demonstrates literature-informed design, artefact delivery, critical reflection and formal technical communication. This alignment supports both assessment quality and practical software engineering relevance.

## 6.2 Milestones, Deliverables and Time Management

Milestone sequencing was generally effective. Prioritising schema integrity and endpoint reliability before visual complexity reduced late-stage defect pressure. Introducing tests early improved confidence in subsequent feature additions.

A notable management trade-off was balancing enhanced insight functionality against dissertation writing time. The addition of ONNX provider support increased technical merit but also introduced configuration and fallback complexity. This was mitigated by preserving heuristic operation as default baseline.

## 6.3 What Worked Well

1. **Modular backend structure:** Separation of routing, persistence, connectors and summarisation improved maintainability.
2. **Migration-aware schema evolution:** Conditional column checks reduced compatibility regressions.
3. **User-level data boundaries:** Explicit `user_id` scoping prevented cross-profile contamination.
4. **Privacy controls as product features:** Consent, export and delete endpoints improved trust and governance.
5. **Test-driven confidence:** Automated tests verified high-risk behaviours before submission.

6. **Clear endpoint contracts:** API behaviour is predictable and consistently structured.
7. **Resilient analytics mode:** Optional ONNX support does not block baseline operation due to heuristic fallback.
8. **User transparency:** Export capability permits direct inspection of retained local records.

## 6.4 Limitations and Aspects for Change

1. **No production-grade mobile telemetry agent in final scope:** Although iOS platform fields are supported, collection relies on imported or API-submitted data in current MVP.
2. **No cloud sync or encrypted multi-device replication:** Local-first model is strong for privacy but limits mobility.
3. **Basic role model:** Global analytics currently depends on static admin key header.
4. **No formal threat model document embedded in artefact repository:** Security controls are implemented but not accompanied by a full STRIDE/LINDDUN analysis.
5. **UI accessibility depth could be expanded:** Dashboard function is strong, but formal accessibility audit is outside current scope.

6. **Retention policy controls are limited:** The current version supports full delete, but not scheduled retention windows in the user interface.
7. **Threat model documentation is implicit:** Security assumptions exist in code but are not formalised in a dedicated model artefact.

## 6.5 Future Development and Research Paths

1. Implement optional end-to-end encrypted synchronisation between trusted devices.
2. Add at-rest database encryption and key management hardening.
3. Introduce richer policy controls (retention windows, selective redaction tiers).
4. Expand sentiment and topic inference with offline model benchmarking and explainability metrics.
5. Add formal threat modelling and privacy impact assessment templates.
6. Develop a native iOS/Android companion collector under explicit consent prompts.
7. Introduce reproducible performance benchmarks for high-volume ingestion scenarios.

8. Add configurable retention windows and selective field redaction policies.
9. Formalise threat modelling using STRIDE or LINDDUN with mitigation traceability.
10. Evaluate user understanding of consent and control affordances through structured usability studies.

## 6.6 Final Critical Position

Myriad provides a technically coherent and security-aware proof-of-concept that balances analytical utility with data protection expectations. While not a complete commercial product, the artefact demonstrates robust foundations and a clear route to future academic or industry-grade enhancement. Within the project constraints, outcomes are realistic, relevant and strongly aligned with cyber security practice.

## 6.7 Sustainability and Long-Term Maintainability Considerations

Long-term maintainability depends on preserving modular boundaries and stable endpoint contracts. The project currently demonstrates both qualities, but sustained quality will require disciplined dependency updates, migration testing and documentation refresh. Native module dependencies, particularly SQLite bindings in Electron environments, can become upgrade hotspots and should be reviewed per release cycle.

From a sustainability perspective, local-first systems may reduce infrastructure energy overhead compared with permanently active cloud services for small-scale personal analytics use cases. However, this benefit should be interpreted cautiously because end-device compute efficiency and user hardware diversity can vary. A future study could compare energy and performance profiles across local-only, hybrid and cloud-first variants.

Academic and professional value of the artefact lies in its transferability. The core pattern demonstrated by Myriad can support other privacy-sensitive domains where central data accumulation is undesirable. In this sense, the project contributes a practical implementation template rather than a narrow single-purpose prototype.

## 6.8 Residual Risk Reflection

Despite successful delivery, residual risks remain and require acknowledgement. First, pseudonymisation reduces direct identifier exposure but cannot guarantee complete immunity from inference if topic, timing and category combinations become uniquely identifying in small datasets. Second, static admin-key control for global views is appropriate for prototype operation but should evolve into stronger role-based access controls for broader deployment. Third, parser robustness depends on assumptions about connector formats; malformed or adversarially crafted import files may still trigger edge-case behaviour not covered by current tests.

Operational risk can also arise from user misunderstanding. If users treat enhanced narrative outputs as definitive conclusions rather than suggestive summaries, decision quality may be affected. The current warning and confidence fields reduce this risk but do not remove it entirely. Future versions should include clearer user-facing explanation of uncertainty boundaries and model limitations.

These residual risks do not invalidate project outcomes; rather, they provide a realistic framing of maturity level. The current artefact should be interpreted as a strong privacy-aware MVP with validated controls in defined contexts, and with an explicit roadmap for hardening.

\newpage

# 7. References

Express.js (2026) *Express - Node.js web application framework*. Available at: https://expressjs.com/ (Accessed: 28 March 2026).

Electron (2026) *Electron documentation*. Available at: https://www.electronjs.org/docs/latest/ (Accessed: 28 March 2026).

Node.js (2026) *Node.js documentation*. Available at: https://nodejs.org/docs/latest/api/ (Accessed: 28 March 2026).

SQLite (2026) *SQLite documentation*. Available at: https://www.sqlite.org/docs.html (Accessed: 28 March 2026).

NPM (2026) *better-sqlite3 package documentation*. Available at: https://www.npmjs.com/package/better-sqlite3 (Accessed: 28 March 2026).

NPM (2026) *bcryptjs package documentation*. Available at: https://www.npmjs.com/package/bcryptjs (Accessed: 28 March 2026).

NPM (2026) *multer package documentation*. Available at: https://www.npmjs.com/package/multer (Accessed: 28 March 2026).

NPM (2026) *supertest package documentation*. Available at: https://www.npmjs.com/package/supertest (Accessed: 28 March 2026).

NPM (2026) *@xenova/transformers package documentation*. Available at: https://www.npmjs.com/package/@xenova/transformers (Accessed: 28 March 2026).

European Union (2016) *Regulation (EU) 2016/679 (General Data Protection Regulation)*. Available at: https://eur-lex.europa.eu/eli/reg/2016/679/oj (Accessed: 28 March 2026).

\newpage

# 8. Appendices

## Appendix A: Artefact Repository Structure (Delivered)

- `data/` - local SQLite database files
- `electron/` - desktop shell main and preload scripts
- `public/` - frontend pages and dashboard scripts/styles
- `src/` - server routes, database logic, anonymisation, connectors, summary generation
- `test/` - automated unit and API tests

## Appendix B: API Endpoint Catalogue

### Health

- `GET /api/health`

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/users`

### Consent

- `GET /api/consent`
- `POST /api/consent`

### Events and Analytics

- `POST /api/events`
- `POST /api/events/batch`
- `POST /api/events/sample-seed`
- `GET /api/summary`
- `GET /api/summary/global` (admin)
- `GET /api/summary/enhanced`
- `GET /api/events/export`
- `DELETE /api/events`
- `POST /api/events/reassign-unknown-device`

### Import Connectors

- `POST /api/import/whatsapp`
- `POST /api/import/telegram`
- `POST /api/import/browser-history`
- `POST /api/import/upload?connector=...`

## Appendix C: Selected Validation Evidence

Final automated test execution summary:

- Total tests: 10
- Passed: 10
- Failed: 0
- Duration: approximately 2 seconds

Validated behaviour included user isolation, consent enforcement, import correctness, pseudonymisation, admin controls, enhanced summary response integrity, and cache behaviour.

## Appendix D: Example Event Payload

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

## Appendix E: Formatting Compliance Checklist

- Cover page and declaration included.
- Core section order follows Appendix 3 guidance.
- Formal third-person academic writing style used.
- Glossary included.
- Table of contents and table of figures included.
- References provided in Harvard-style formatting.
- New pages inserted between major sections as requested by handbook guidance.
