# Open Stay Focused Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship the approved local-first Chrome extension and a public GitHub release.

**Architecture:** Pure policy functions determine matching, schedules and quotas.
A serialized service-worker controller owns persisted state and Chrome events.
Local extension pages and content scripts communicate through validated messages.

**Tech Stack:** Manifest V3, JavaScript ES modules, Node test runner,
Playwright Chromium extension tests, ZIP packaging, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-17-open-stay-focused-design.md`.

## Global Constraints

- Name: Open Stay Focused. No affiliation with StayFocusd or Sensor Tower.
- Account sync and AI-chat analytics are excluded from version 0.1.0.
- Use Manifest V3 and plain JavaScript ES modules with a small build/package script.
- No identity, remote analytics or remote runtime code.
- Keep local daily totals for 30 days.
- Do not import usage or nuclear state to bypass restrictions.
- Package original icons and an original visual identity.
- GitHub publication is the initial release destination.
- Implement independently; do not copy vendor code, assets or challenge text.
- Use Node 22 or newer for tooling and Chrome 120 or newer for the release.

## Review Focus

- Host confusion: credentials, ports, Unicode and suffix lookalikes must not
  turn `example.com` into a match for `notexample.com` (Task 1).
- Time discontinuities: DST, backward clocks, sleep and worker termination
  must not duplicate time or charge unattended intervals (Tasks 1–2).
- Mutation bypasses: forged messages, imported extra state and stale settings
  must not weaken active nuclear snapshots (Task 2).
- SPA and background tabs: an already-open page must be checked when it
  becomes active or changes its route (Task 3).
- Recovery: invalid imports, failed storage writes and unsupported browser
  pages must produce actionable errors without silently losing policy (Tasks 2–4).

## File and state contracts

- `extension/core/patterns.js`: parse and match documented URL patterns.
- `extension/core/policy.js`: local calendar, schedules and block decisions.
- `extension/core/settings.js`: defaults and strict import validation.
- `extension/core/accounting.js`: bounded, interval-split accounting.
- `extension/controller.js`: serialized commands with injected storage/clock.
- `extension/background.js`: Chrome API event/message adapter.
- `extension/content.js`: activity heartbeat, navigation checks, hiding styles.
- `extension/distractions.js`: original per-site selector definitions.
- `extension/ui/`: popup, settings, block page and shared styles/helpers.
- `tests/`: policy/controller unit tests and browser integration fixtures.
- `scripts/package.mjs`: validated, deterministic extension ZIP creation.

Settings contain `schemaVersion: 1`, `groups`, `allowlist`, `schedule`,
`resetMinute`, `challengeEnabled` and `distractions`. Groups contain stable
`id`, `name`, `enabled`, `patterns`, `budgetMs`. Schedule contains `days`
(Sunday = 0) and `intervals` of local minute pairs. `[0,1440]` means all day;
overnight intervals have end < start; equal endpoints are rejected.

Persist one versioned state record containing settings, accounting checkpoint,
budget-day usage per group, local-date statistics per hostname, and an optional
nuclear session `{startAt,endAt,mode,policySnapshot}`. Stats and budget usage
are independent. UI exports settings only. Do not persist complete visited URLs.
Use ephemeral browser-session storage for any active-tab URL needed across
service-worker restarts; invalidate the checkpoint across browser restarts.

## Task 1: Pure policy and accounting engine

**Files:** Create `package.json`, `extension/core/{patterns,policy,settings,accounting}.js`,
`tests/{patterns,policy,settings,accounting}.test.js` and `.gitignore`.

**Interfaces:**
- `parsePattern(text) -> {host,path}`; `matchesPattern(url, pattern) -> boolean`.
- `defaultSettings() -> Settings`; `validateSettings(input) -> Settings` or throws.
- `budgetDay(now, resetMinute) -> string`; `isScheduled(now,schedule) -> boolean`.
- `evaluate(url, now, state) -> {blocked,reason,groupIds,remainingMs}`.
- `accountInterval(state,{url,from,to,eligible}) -> State` returns updated totals.

- [ ] Write failing Node tests: `matchesPattern('https://notexample.com',
  parsePattern('example.com')) === false`; subdomains match; optional HTTP(S)
  prefix, punycode, explicit paths and `*` paths work; reject credentials,
  query/hash, ports, unsupported schemes and malformed patterns. Paths are
  case-sensitive and anchored, while hosts are normalized.
- [ ] Add policy tests asserting allowlist priority, each nuclear mode,
  overlapping-group exhaustion, midnight/reset boundaries and overnight
  start-day ownership. Test DST with `TZ=America/New_York` and local dates.
- [ ] Add accounting tests: two matching groups accrue once each; ineligible
  intervals accrue zero; backward time accrues zero; gaps over 15 seconds
  accrue zero; intervals crossing schedule/reset/midnight boundaries split
  at those boundaries. Prune stats by local date, retaining 30 dates.
- [ ] Add validation tests rejecting duplicate IDs, invalid day/minute values,
  NaN/nonfinite budgets, unexpected keys and files over 256 KiB. Bound groups
  to 100 and total patterns to 1,000; allow zero budgets for immediate blocks.
- [ ] Run `node --test tests/*.test.js`; confirm missing-module/assertion failures.
- [ ] Implement the contracts with no Chrome dependencies; all calendar
  boundaries use local date construction. Normal quota accrues only in
  scheduled periods and outside the allowlist; stats accrue foreground time.
- [ ] Run `npm test`; require all policy tests to pass. Commit engine and tests.

## Task 2: Persistent controller and protected mutations

**Files:** Create `extension/controller.js`, `tests/controller.test.js`.

**Interfaces:**
- `createController({storage,clock}) -> {handle,tick,snapshot}`.
- `handle(command, trustedContext) -> Promise<Result>` handles `getState`,
  `saveSettings`, `startNuclear`, `cancelScheduledNuclear`, `clearStats`.
- `tick({url,tabId,focused,active,lastHeartbeat,now}) -> Promise<Decision>`.
- Injected storage provides `get()` and `set(state)`; mutations are serialized.

- [ ] Write failing tests for serialized concurrent ticks, restart recovery,
  duplicate heartbeats, tab transitions and storage-write rejection. State
  changes become authoritative only after storage writes succeed.
- [ ] Add tests that content contexts cannot read global stats or issue
  settings commands; all mutation commands require trusted extension pages.
- [ ] Add tests that settings/import writes require the original challenge
  phrase when enabled; active nuclear sessions reject settings writes and
  cancellation; stats clearing preserves usage and nuclear state. A future
  session can be canceled before start, but cannot overwrite an active one.
- [ ] Add tests proving imported extra state is rejected and a nuclear
  snapshot remains stable if ordinary settings change before its start.
- [ ] Run `node --test tests/controller.test.js` and observe failure.
- [ ] Implement controller using Task 1 contracts. Use a fixed original
  challenge phrase, exact equality, and a structured error result. Limit
  nuclear durations to 1–1,440 minutes, with an explicit future start time.
- [ ] Run `npm test`; require all tests to pass. Commit controller and tests.

## Task 3: Chrome lifecycle, enforcement and content adapters

**Files:** Create `extension/manifest.json`, `extension/background.js`,
`extension/content.js`, `extension/distractions.js`,
`tests/browser/lifecycle.spec.js`, `tests/fixtures/distractions.html`.

**Interfaces:** Background adapts Chrome events to controller commands.
Content messages are `heartbeat` and `checkPage`; worker derives URL and tab
identity from verified browser state. UI uses `chrome.runtime.sendMessage`.

- [ ] Add failing browser tests for loading the extension, expiry redirect,
  new blocked-tab navigation, SPA route changes, tab/window focus changes,
  idle transitions and service-worker restart. Include a controlled HTTP
  fixture server and isolated browser profile; never use the user's profile.
- [ ] Add fixture tests for every supported distraction toggle and dynamic
  DOM insertion. Check disabling a toggle removes its hiding rule.
- [ ] Run `npm run test:browser`; observe missing-extension failures.
- [ ] Implement manifest with storage, tabs, alarms, idle, webNavigation and
  HTTP(S) host access. Use top-frame content scripts and strict message
  sender checks. Do not request declarativeNetRequest in this first release:
  post-navigation checks and local block-page redirects are the explicit
  enforcement model; document that content can load briefly before redirect.
- [ ] Register listeners synchronously. Use five-second activity heartbeats,
  browser tab/focus verification and alarms for recovery. Account the previous
  eligible tab before transitions; do not attribute its interval to a new URL.
  Reset eligibility across browser restarts and stale-heartbeat gaps.
- [ ] Implement blocks using the local block page with reason/group identifiers,
  not the original URL. SPA checks run on history-state events. Check current
  eligible pages on quota, schedule and nuclear transitions.
- [ ] Implement independent CSS selectors for approved social-site controls;
  share adapter definitions with fixtures and update styles on storage changes.
- [ ] Run unit and browser tests; resolve worker/console errors. Commit adapters.

## Task 4: Accessible popup, settings and blocked-page flows

**Files:** Create `extension/ui/{popup,options,blocked}.{html,js}`,
`extension/ui/shared.js`, `extension/ui/styles.css`, original icons,
`tests/browser/ui.spec.js`.

**Interfaces:** UI consumes Task 2 commands through Task 3 messaging.
Use settings validation for both form saves and imported JSON.

- [ ] Add failing UI tests for group creation, popup add-current-site,
  budget display, allowlist edits, schedule edits, nuclear start/end and
  challenge rejection/success. Include keyboard operation and form errors.
- [ ] Add tests for settings export/import round-trip, oversized/malformed
  import recovery and clearing statistics without resetting a budget.
- [ ] Run `npm run test:browser`; observe missing-interface failures.
- [ ] Implement responsive local pages with explicit labels, original copy,
  visible errors and text-only data rendering. Explain nuclear irreversibility
  immediately before the start action. Reject paste in the challenge input.
  Display recent per-domain totals and current group budgets separately.
- [ ] Implement popup quick-add through the same protected settings path.
  Unsupported browser URLs show an explanatory state. Handle worker/storage
  errors without reporting success or discarding unsaved edits.
- [ ] Run browser tests and inspect screenshots at popup and narrow/wide
  settings sizes. Record live-site checks separately from fixture tests.
- [ ] Run `npm test`; commit interface and integration tests.

## Task 5: Packaging, documentation and release verification

**Files:** Create `scripts/package.mjs`, `tests/package.test.js`,
`README.md`, `LICENSE`, `PRIVACY.md`, `CONTRIBUTING.md`,
`docs/architecture.md`, `docs/verification.md`, `.github/workflows/ci.yml`.

**Interfaces:** `npm test`, `npm run test:browser`, `npm run build` and
`npm run package` are reproducible public commands. Release asset:
`dist/open-stay-focused-0.1.0.zip` with manifest at its root.

- [ ] Write failing package tests asserting only extension files are present,
  every manifest/UI reference exists, and no vendor package, browsing data,
  dependencies, development fixtures or credentials enter the ZIP.
- [ ] Implement deterministic packaging, CI and Node/Chrome prerequisites.
  Runtime remains dependency-free; pin test tooling in the lockfile.
- [ ] Write MIT license, privacy/permission explanations, install instructions,
  chosen matching/time semantics, accepted limitations and known differences
  from StayFocusd. Explain post-navigation flashing, best-effort DOM selectors,
  missing sync/AI analytics and browser-level disable/uninstall capabilities.
- [ ] Run all unit/browser/package checks against the final artifact; load
  the unpacked ZIP into a fresh browser profile. Record commands/results in
  `docs/verification.md`, explicitly identifying anything not verified.
- [ ] Perform one full review against the spec and five review-focus items;
  fix findings and perform one focused fix review. Keep unresolved blockers
  explicit and continue resolving them before release.
- [ ] Commit release-ready files. Confirm GitHub account and target absence,
  create public `xingwudao/open-stay-focused`, push `main`, and inspect CI.
  If the target now exists or belongs elsewhere, inspect rather than overwrite.
- [ ] When required CI passes, create tag/release `v0.1.0` with the tested ZIP
  and SHA-256 checksum. Verify remote commit, tag, visibility and downloadable
  asset. Report implementation, local tests, remote CI and publication as
  separate states, with repository/release links.

## Plan self-review

All approved functional requirements map to Tasks 1–4; documentation,
verification and distribution map to Task 5. Signatures and state fields
are shared through the contracts above. The five review-focus classes
each have explicit tests in their owning task. No remote action occurs
before the implementation and artifact checks. Execution method is pending
user selection; recommended method is native execution in this session.

## Execution record

Implementation and focused review fixes are complete. Actual filenames were
consolidated into `tests/core.test.js` and `tests/browser/extension.spec.js`;
Chrome eligibility fields are combined into `eligible` at the adapter boundary.
See `docs/review.md` for decisions and `docs/verification.md` for command results.
Remote publication remains pending until CI passes.
