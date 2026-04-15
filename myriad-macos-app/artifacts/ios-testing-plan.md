# iOS XCTest/UI Coverage Plan

This repository now includes CI gates (`check:ios-project`, `test:ios`) to prevent silent iOS breakage.

## Required iOS test targets after project restore

1. Unit tests (XCTest)
- Connector payload normalization
- Consent state persistence
- Event batching and deduplication by external ID

2. UI tests (XCUITest)
- App launch to dashboard flow
- Goal creation flow
- Consent toggle blocks ingestion
- Export and delete confirmations

## Minimum CI acceptance criteria

- `xcodebuild test` passes on simulator
- At least one XCTest and one XCUITest suite run
- Project includes `MyriadIOS.xcodeproj/project.pbxproj` in source control

## Current blocker

The workspace copy currently lacks the committed iOS project file (`project.pbxproj`), so runnable iOS test coverage cannot be added until the full iOS project is restored.
