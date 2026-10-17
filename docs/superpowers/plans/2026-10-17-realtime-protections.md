# Real-time usage and protections implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development or
> superpowers:executing-plans. Reuse current workers and one final review coordinator.

**Goal:** Reconstruct evidenced timing/statistics/protection behavior with independent
local code and correct the observed original edge-case defects.
**Architecture:** Pure settings/policy/accounting modules; one serial controller for
all writes; browser adapter provides eligible tabs; UI queries authoritative state.
**Tech Stack:** Manifest V3, dependency-free ES modules, Node tests, Playwright Chromium.
**Spec:** `docs/superpowers/specs/2026-10-17-realtime-protections.md`.

## Global constraints

Chrome >=120, Node >=22, local-only, bilingual, existing data preserved, no vendor code.
User explicitly chose immediate protections for every upgraded user; no additional
approval gate for that same product choice. Existing publication scope persists.

## Review focus

- Import/direct commands must obey the same protections as disabled form controls.
- Multiple eligible tabs must not double-charge a host/group.
- Delayed schedule application must preserve quotas and stale-editor detection.
- IME/challenge edits must not accidentally approve a different pending command.
- Crash/sleep/clock rollback must never create an unbounded time charge.

## Task 1: Settings protections and controller

Owner: friction worker. Files: core/settings.js, new core/protections.js, controller.js,
tests/protections.test.js and existing controller/language tests as needed.
- [x] Write failing migration/guard/confirmation/delay tests.
- [x] Implement schema2 and central protected mutation flow.
- [x] Verify targeted tests including forged/imported mutations and restart.

## Task 2: Accounting and statistics

Owner: statistics worker. Files: core/accounting.js, new core/statistics.js,
tests/statistics.test.js and accounting tests as needed.
- [x] Pin eligible multi-tab dedup, calendar splits, stats starts and clear separation.
- [x] Implement multi-input interval accounting + aggregation/export.
- [x] Verify unit tests and document exact API for adapter/UI.

## Task 3: Bilingual UI

Owner: timing worker. Files: extension/ui/* and tests/browser/extension.spec.js.
- [x] Update tests for mandatory challenge plus new live/protection settings flows.
- [x] Implement mutation preparation/confirmations, strict IME-aware challenge,
  live refresh without draft replacement, new settings and statistics.
- [x] Verify targeted Chromium flows; root handles full regression later.

## Task 4: Browser adapter and release integration

Owner: root. Files: background.js, content.js, new adapter tests, docs/version/release.
- [x] Add tests for live current-page payload, audio/dedup and denied content access.
- [x] Sample eligible tabs, one-second foreground heartbeat, scoped floating timer,
  toolbar badge and serialized refresh; retain reliable checkpoint persistence.
- [x] Integrate worker APIs, run complete unit/build/browser suites and package checks.
- [x] One independent review, fixes and one focused review; no unresolved blockers.
- [ ] Publish v0.2.0 after remote CI and byte-identical package verification.
