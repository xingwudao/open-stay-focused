# Beneficial Site Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frictionless beneficial-site pool whose independent daily foreground-time ledger drives safe quota redirects and 50%/80% companion recommendations.

**Architecture:** Extend the validated settings and root state with a versioned pool and a positive ledger, then keep selection in one pure `redirect-policy.js` module. The existing sampler supplies a separate foreground-only visit set, while background redirect and companion paths consume the same selector immediately before presenting a destination.

**Tech Stack:** Chrome Extension Manifest V3, browser JavaScript ES modules, `chrome.storage.local`, Node test runner, Playwright, existing packaging scripts; no new dependency or permission.

**Spec:** `docs/superpowers/specs/2026-10-31-beneficial-site-pool-design.md`

## Global Constraints

- Pool entries use `{id, name, url, enabled, targetMs}` and settings use `beneficialPool: {policy, items}`.
- Policies are exactly `largestDeficit` (default) and `random`; no plug-in registry.
- `targetMs` is 1–1,440 whole minutes expressed in milliseconds; maximum 100 items.
- Names are 1–80 characters; URLs are HTTP(S), at most 2,048 characters, contain no credentials, retain search, and drop fragments.
- Positive time counts only in an active foreground tab in the focused, non-minimized window while Chrome reports the user active; background audio never counts.
- Positive time uses `budgetDay(now, settings.resetMinute)` and the existing 30-day retention window.
- Pool-only edits never require confirmations or a typing challenge, including under exhausted budgets and active nuclear sessions.
- Only ordinary `reason: 'quota'` exhaustion may redirect; nuclear focus always uses the existing blocked page.
- Redirects and companion links navigate the current tab and must be filtered against the latest settled restrictions.
- Empty or unsafe pools preserve the existing blocked-page behavior.
- All data stays in `chrome.storage.local`; do not add permissions, host permissions, dependencies, analytics, or content reading.
- Preserve current uncommitted default-30-minute edits in `extension/ui/i18n.js`, `extension/ui/options.html`, `extension/ui/popup.js`, and `tests/browser/extension.spec.js`; stage only feature hunks when those files overlap.

## Review Focus

- A destination that becomes blocked between initial selection and navigation must be rejected and fall back to the blocked page; pin this in Task 5.
- Audible background tabs and popup ownership must not leak background time into the positive ledger; pin this in Task 3.
- Two enabled entries on one hostname must both accrue the same interval without sharing IDs or targets; pin this in Task 3.
- Pool-only saves during nuclear focus must succeed while a mixed pool-plus-restriction relaxation remains locked; pin this in Task 4.
- Malformed imported pool data, duplicate IDs, URL credentials, fragments, and oversized arrays must fail or normalize exactly at the settings boundary; pin this in Task 1.

---

### Task 1: Versioned Beneficial-Pool Settings

**Files:**
- Modify: `extension/core/settings.js`
- Modify: `tests/core.test.js`
- Modify: `tests/language.test.js`
- Modify: `tests/package.test.js`

**Interfaces:**
- Consumes: existing `defaultSettings()` and `validateSettings(input)` migration/validation boundary.
- Produces: schema version 3 settings with validated `beneficialPool`; normalized item URLs and stable item fields for all later tasks.

- [ ] **Step 1: Write failing schema, migration, and validation tests**

Add assertions that:

- `defaultSettings()` returns `schemaVersion: 3` and `{policy: 'largestDeficit', items: []}`.
- Schema 2 migrates without changing groups, usage, statistics, nuclear deadline, or other settings.
- A valid pool round-trips with query strings retained and fragments removed.
- Validation rejects unknown policies, duplicate/malformed IDs, empty or 81-character names, credentials, non-HTTP(S) and over-2,048-character URLs, non-whole-minute and out-of-range targets, 101 items, extra fields, and settings beyond 256 KiB.

- [ ] **Step 2: Run the focused tests and verify the new assertions fail**

Run: `node --test tests/core.test.js tests/language.test.js tests/package.test.js`

Expected: FAIL because schema 3 and `beneficialPool` are not implemented.

- [ ] **Step 3: Implement schema 3 defaults, migration, and strict validation**

In `extension/core/settings.js`:

- Add `beneficialPool` to `defaultSettings()`.
- Migrate schemas 1 and 2 to schema 3 with an empty default pool.
- Validate exact pool/item keys, item count, unique stable IDs, trimmed name limits, enabled booleans, target range/integrality, and normalized HTTP(S) URLs.
- Use the platform `URL` parser, reject username/password, set `hash = ''`, and serialize the normalized URL.
- Keep the existing input-size guard and re-check the normalized serialized settings before returning them.

- [ ] **Step 4: Run the focused tests**

Run: `node --test tests/core.test.js tests/language.test.js tests/package.test.js`

Expected: PASS.

- [ ] **Step 5: Commit only Task 1 files**

```bash
git add extension/core/settings.js tests/core.test.js tests/language.test.js tests/package.test.js
git diff --cached --check
git commit -m "feat: validate beneficial site pool"
```

### Task 2: Pure Redirect Policy

**Files:**
- Create: `extension/core/redirect-policy.js`
- Create: `tests/redirect-policy.test.js`

**Interfaces:**
- Consumes: validated `beneficialPool`, `beneficialUsage[budgetDay]`, current page URL, and an eligibility callback.
- Produces: `selectBeneficialDestination({pool, usage, currentUrl, isEligible, random})`, returning `{id, name, url, targetMs, usedMs, remainingMs}` or `null`; `matchesBeneficialHost(url, itemUrl)` for Task 3.

- [ ] **Step 1: Write failing deterministic selector tests**

Cover these exact behaviors:

- `matchesBeneficialHost` accepts the destination hostname and subdomains but not sibling suffixes or non-web URLs.
- `random: () => 0` chooses the first eligible entry and `random: () => 0.999` chooses the last.
- `largestDeficit` uses `max(0, targetMs - usedMs)` and resolves equal deficits with injected randomness.
- When all goals are met, the zero-deficit tie still selects uniformly.
- Disabled, current-page-equivalent, and `isEligible(item) === false` candidates are filtered.
- Empty/all-filtered pools return `null`.

- [ ] **Step 2: Run the new test and verify it fails**

Run: `node --test tests/redirect-policy.test.js`

Expected: FAIL because `extension/core/redirect-policy.js` does not exist.

- [ ] **Step 3: Implement the smallest pure policy module**

Implement only the two exported functions above. Normalize the current page and item URLs before equality checks, clamp the injected random index into the candidate array, and treat missing usage as zero.

- [ ] **Step 4: Run the policy tests**

Run: `node --test tests/redirect-policy.test.js`

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add extension/core/redirect-policy.js tests/redirect-policy.test.js
git diff --cached --check
git commit -m "feat: select beneficial destinations"
```

### Task 3: Independent Positive Usage Ledger

**Files:**
- Modify: `extension/core/accounting.js`
- Modify: `extension/core/tracking.js`
- Modify: `extension/controller.js`
- Modify: `extension/background.js`
- Modify: `tests/statistics.test.js`
- Modify: `tests/tracking.test.js`
- Modify: `tests/controller.test.js`

**Interfaces:**
- Consumes: Task 1 pool items, Task 2 `matchesBeneficialHost`, existing sampler tab/window/idle data, and controller settlement timestamps.
- Produces: root `beneficialUsage[budgetDay][itemId]`; `foregroundVisits({tabs, win, idle, beats, now, popupFocused})`; controller `tick({url, tabId, visits, beneficialVisits, eligible, now})` settled independently from ordinary `visits`.

- [ ] **Step 1: Write failing ledger and foreground-eligibility tests**

Add tests asserting:

- `initialState()` includes `beneficialUsage: {}` and pruning removes positive days older than 30 days.
- An eligible interval increments every enabled pool item whose hostname covers the foreground URL.
- Two entries sharing one hostname both receive the full interval; disabled and nonmatching entries do not.
- The reset boundary splits/keys progress using `budgetDay`, not calendar day.
- `clearStats` leaves `beneficialUsage` unchanged.
- `foregroundVisits` excludes idle/locked, minimized/unfocused, stale/unloaded/discarded, inactive, and audible-background tabs.
- A live popup may preserve the owning active foreground page exactly as ordinary quota tracking does.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test tests/statistics.test.js tests/tracking.test.js tests/controller.test.js`

Expected: FAIL because the positive ledger and foreground visit path do not exist.

- [ ] **Step 3: Add positive accounting to the existing settlement path**

In `extension/core/accounting.js`, initialize/prune `beneficialUsage` and extend `accountIntervalMany` to accept `beneficialVisits = []`. Inside the existing per-second span loop, add each span to all matching enabled item IDs under `budgetDay(t, resetMinute)` so reset boundaries are respected without writing observed path/query data.

- [ ] **Step 4: Add a foreground-only visit selector**

In `extension/core/tracking.js`, export `foregroundVisits(...)` using the existing foreground/popup heartbeat rules but never the `trackAudio` branch. Reuse it inside `eligibleVisits` where doing so removes duplication without changing existing behavior.

- [ ] **Step 5: Wire the sampler and controller settlement**

Pass both ordinary `visits` and positive `beneficialVisits` through `createController().tick(...)`; ensure settings changes settle both ledgers against the old checkpoint before applying new pool data.

- [ ] **Step 6: Run focused tests**

Run: `node --test tests/statistics.test.js tests/tracking.test.js tests/controller.test.js`

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add extension/core/accounting.js extension/core/tracking.js extension/controller.js extension/background.js tests/statistics.test.js tests/tracking.test.js tests/controller.test.js
git diff --cached --check
git commit -m "feat: track beneficial site goals"
```

### Task 4: Frictionless Pool Settings UI

**Files:**
- Modify: `extension/core/protections.js`
- Modify: `extension/ui/options.html`
- Modify: `extension/ui/options.js`
- Modify: `extension/ui/i18n.js`
- Modify: `extension/ui/styles.css`
- Modify: `tests/protections.test.js`
- Modify: `tests/language.test.js`
- Modify: `tests/browser/extension.spec.js`

**Interfaces:**
- Consumes: Task 1 validated pool shape and existing options `collect()`/`render()`/`mutate()` flow.
- Produces: bilingual “Better destinations” editor; restrictive comparison that ignores `beneficialPool` but continues to compare every restriction field.

- [ ] **Step 1: Write failing protection tests**

Assert pool-only add/edit/delete/enable/disable/policy changes return `{steps: 0, challengeRequired: false}` under normal, exhausted, and active-nuclear states. Assert a save that also adds an allowlist entry or loosens another restriction still requires the existing protection and remains rejected during nuclear focus.

- [ ] **Step 2: Run protection tests and verify failure**

Run: `node --test tests/protections.test.js`

Expected: FAIL because nuclear focus currently rejects pool-only saves and schema 3 is not excluded from the restriction key.

- [ ] **Step 3: Exclude the complete pool from restrictive comparison**

Change `restrictionKey(settings)` so `beneficialPool` never affects relaxation assessment. Keep the full validated settings object in storage; do not special-case or bypass revision checks.

- [ ] **Step 4: Write failing options/browser tests**

Cover rendering and saving policy plus rows with name, URL, target minutes, enabled, add, and remove controls; bilingual copy; duplicate/invalid input notice; same-host explanatory copy; export/import round-trip; and the nuclear banner stating that restrictive settings are locked while the pool remains editable.

- [ ] **Step 5: Run the focused UI tests and verify failure**

Run: `node --test tests/language.test.js && npx playwright test tests/browser/extension.spec.js`

Expected: FAIL because pool controls and copy do not exist.

- [ ] **Step 6: Implement the pool editor in existing options patterns**

Render rows from `state.settings.beneficialPool`, generate a stable random ID only when adding a row, convert target minutes to/from `targetMs`, and include the pool in `collect()`. Keep one normal save action and rely on the controller’s protection assessment; do not add a pool-specific confirmation, challenge, storage path, or autosave mechanism.

- [ ] **Step 7: Add bilingual labels, help text, validation notices, and nuclear copy**

Use the current translation mechanism and existing card/control styling. Preserve keyboard labels, visible focus states, narrow-window wrapping, and the uncommitted 30-minute default changes already present in overlapping files.

- [ ] **Step 8: Run Task 4 tests**

Run: `node --test tests/protections.test.js tests/language.test.js && npx playwright test tests/browser/extension.spec.js`

Expected: PASS.

- [ ] **Step 9: Commit only feature hunks from overlapping dirty files**

```bash
git add extension/core/protections.js extension/ui/options.js extension/ui/styles.css tests/protections.test.js tests/language.test.js
git add -p extension/ui/options.html extension/ui/i18n.js tests/browser/extension.spec.js
git diff --cached --check
git diff --cached
git commit -m "feat: edit beneficial site pool"
```

### Task 5: Safe Quota Redirect

**Files:**
- Modify: `extension/background.js`
- Modify: `tests/controller.test.js`
- Modify: `tests/browser/realtime.spec.js`

**Interfaces:**
- Consumes: Task 2 `selectBeneficialDestination`, Task 3 current `beneficialUsage`, existing `evaluate(url, now, state)`, and the latest settled state.
- Produces: same-tab quota redirect to a safe selected destination with the existing `blocked.html` as fallback.

- [ ] **Step 1: Write failing redirect integration tests**

Assert that:

- Ordinary quota exhaustion redirects the same tab to the selected beneficial URL.
- Empty, disabled, current-page, or restriction-blocked candidate sets use `blocked.html`.
- A candidate made blocked after an earlier snapshot is rejected using latest settled state.
- `reason: 'nuclear'` always uses `blocked.html`.
- Paused, allowed, outside-schedule, available, and unsupported states do not redirect.
- A target landing page does not loop back through redirect handling.

- [ ] **Step 2: Run the focused browser tests and verify failure**

Run: `npx playwright test tests/browser/realtime.spec.js`

Expected: FAIL because quota exhaustion always uses `blocked.html`.

- [ ] **Step 3: Select immediately before navigation and update the current tab**

In `background.js`, after settlement and only for `result.reason === 'quota'`, call the pure selector with today’s positive ledger. Define `isEligible(item)` by evaluating the candidate URL against the same latest state and accepting only nonblocked results; if selection returns `null` or throws, use the existing block-page URL. Keep nuclear handling on the original block path.

- [ ] **Step 4: Run redirect and controller tests**

Run: `node --test tests/controller.test.js && npx playwright test tests/browser/realtime.spec.js`

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add extension/background.js tests/controller.test.js tests/browser/realtime.spec.js
git diff --cached --check
git commit -m "feat: redirect exhausted quotas to beneficial sites"
```

### Task 6: 50% and 80% Companion Destination Link

**Files:**
- Modify: `extension/core/companion.js`
- Modify: `extension/background.js`
- Modify: `extension/companion.js`
- Modify: `tests/companion.test.js`
- Modify: `tests/browser/realtime.spec.js`

**Interfaces:**
- Consumes: Task 2 selected destination result and existing `companionReminder` payload/deduplication.
- Produces: `claimCompanion(state, groupIds, stage, currentUrl)` and optional `destination: {name, url}` on 50%/80% reminder payloads; a localized current-tab link in the companion card.

- [ ] **Step 1: Write failing payload and overlay tests**

Assert 50% and 80% reminders may include a safe destination, while 100% blocked reminders do not include a dead link. Assert no safe destination preserves the current card. Browser assertions cover English `Visit {name} instead`, Chinese `去看看{name}`, long-name wrapping, keyboard focus, and current-tab navigation.

- [ ] **Step 2: Run companion tests and verify failure**

Run: `node --test tests/companion.test.js && npx playwright test tests/browser/realtime.spec.js`

Expected: FAIL because reminder payloads and cards have no destination.

- [ ] **Step 3: Attach the latest Policy selection to browsing reminders**

Keep milestone calculation and ledger deduplication in `companionReminder`. Extend the background claim path to receive the current page URL, select a safe destination from the latest state only for browsing-stage 50%/80% reminders, and attach `{name, url}` as data. The blocked-page call passes no current URL and does not select a destination.

- [ ] **Step 4: Render one safe accessible link**

In `companion.js`, create a real anchor inside the existing shadow card only when `destination` exists. Set localized text from the current reminder language, preserve the URL as an attribute rather than HTML, navigate the current tab, and add only the minimal wrapping/focus CSS needed inside the existing component styles.

- [ ] **Step 5: Run companion tests**

Run: `node --test tests/companion.test.js && npx playwright test tests/browser/realtime.spec.js`

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

```bash
git add extension/core/companion.js extension/background.js extension/companion.js tests/companion.test.js tests/browser/realtime.spec.js
git diff --cached --check
git commit -m "feat: recommend beneficial sites in reminders"
```

### Task 7: Privacy, Packaging, and Full Regression

**Files:**
- Modify: `PRIVACY.md`
- Modify: `README.md` only if the existing feature list has a directly matching place for this shipped behavior.
- Modify: `tests/package.test.js` only if packaging coverage needs the new core module asserted.

**Interfaces:**
- Consumes: completed Tasks 1–6.
- Produces: accurate public privacy disclosure and a verified package; no release, version bump, push, or store publication.

- [ ] **Step 1: Add privacy and minimal feature documentation**

Document that configured destination names/URLs and ID-keyed daily foreground totals remain local, use 30-day retention, may be disclosed to the current page only as the visible reminder link, and never include observed path/query/content. State that the extension reads active-tab URL/timing metadata only for matching and accounting.

- [ ] **Step 2: Run all unit tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 3: Run all browser tests**

Run: `npm run test:browser`

Expected: all tests PASS.

- [ ] **Step 4: Verify the distributable package**

Run: `npm run build`

Expected: package validation succeeds and includes `extension/core/redirect-policy.js` without adding a permission.

- [ ] **Step 5: Inspect repository and staged scope**

Run: `git diff --check && git status --short && git diff -- extension/manifest.json`

Expected: no whitespace errors; the pre-existing default-30-minute edits remain intact; `manifest.json` has no permission or version change from this feature.

- [ ] **Step 6: Commit documentation/package assertions only**

```bash
git add PRIVACY.md README.md tests/package.test.js
git diff --cached --check
git commit -m "docs: explain beneficial site data"
```

- [ ] **Step 7: Perform final review before any release action**

Review the complete feature diff against the spec, with particular attention to current-tab navigation, nuclear fallback, storage migration, import/export, local-only disclosure, and preservation of unrelated dirty hunks. Do not push, publish, or bump the extension version without a separate explicit user request.
