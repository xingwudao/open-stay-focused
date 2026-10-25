# Verification record

Release candidate: 0.1.0. Date: 2026-10-17.

## Local checks before independent review

- `npm test`: 18 passing tests. Covers policy, clocks, controller transactions,
  privilege boundaries, import validation, nuclear locks and reproducible ZIP.
- `npm run test:browser`: 10 passing Chromium integration tests. Covers loading,
  settings CRUD, post-navigation and SPA blocking, existing-tab quota expiry,
  worker/browser restart, challenge/import flows, content-message rejection,
  restricted private storage and all distraction-adapter DOM fixtures.
- `npm run build`: manifest references and syntax validated.
- `npm run package` and `unzip -t`: deterministic ZIP generated and valid.
- Desktop (1360 px) and narrow (390 px) options layouts visually inspected.
- Screenshots in `docs/images/` use invented example settings.

The wildcard stress test first reproduced exponential regexp backtracking;
matching was replaced with a bounded iterative wildcard algorithm. Special
object-key accounting was also reproduced and fixed with own-property counters.
A test selector ambiguity was corrected using an exact accessible label.

## Boundaries

Original StayFocusd analysis is static and partial, not runtime equivalence.
Social-site adapters have controlled DOM fixture coverage; no signed-in live
YouTube, Instagram, Facebook, X or TikTok account was used or inspected.
Real OS sleep/lock behavior was modeled through injected clocks/eligibility;
actual worker termination and complete browser restart were exercised.
Chrome Web Store installation and store publication are not part of this release.

Independent review, final artifact smoke test, remote CI and publication are
recorded below when completed; they are not implied by the local checks above.

## Final local verification after review fixes

- Independent review: four Important findings, all reproduced and fixed;
  no Critical findings. See `review.md` for findings, fixes and decisions.
- `npm test`: 21/21 passed after the focused fixes.
- Packaged artifact: `open-stay-focused-0.1.0.zip`, 51,693 bytes, 20 files.
- `EXTENSION_PATH=dist/unpacked npm run test:browser`: 14/14 passed against
  the ZIP's extracted contents, including live settings propagation into a
  controlled social-site fixture without reloading the page.
- SHA-256:
  `3ead52417d5d7eec8ea6ae4d1bc38f5663221167092490a597e7038f5ed8d97f`.
- `npm audit --audit-level=high`: no vulnerabilities reported.
- Idle/focus browser adapter checks use controlled OS API responses. Quick-add
  uses the real popup/controller with an injected active-tab API result because
  headless Chromium does not expose a native toolbar popup as a Playwright page.

Remote CI and publication are pending at this commit. The release's GitHub
Actions results and release page provide the final remote status.

## Version 0.1.1: Chinese / English language selection

Date: 2026-10-17.

- Added an English/Simplified Chinese selector with saved local preference.
- Legacy settings migrate to English without changing quotas or focus deadlines.
- Options, popup, blocked page, prompts, durations and challenges are localized.
  Draft preview preserves edits; challenges validate against the saved language.
- `npm test`: 25/25 passed, including migration and reproducible packaging.
- `npm run test:browser`: 16/16 passed in isolated Chromium.
- Extracted ZIP language integration tests: 2/2 passed.
- `npm run build`, `unzip -t`, and `git diff --check`: passed.
- Chinese desktop layout visually inspected; no horizontal overflow.
- Independent read-only review found no blocking correctness, security or
  significant translation issues; its 24 core/controller/language tests passed.
- ZIP: 66,389 bytes, 21 files. SHA-256:
  `e03efd2e1950beaa6e17cd22d2260122a7fdd2a57c4c36b792086dcd65e7ca83`.

Remote CI and publication for 0.1.1 are pending at this commit; consult the
GitHub Actions result and release page for their final status.

## Version 0.2.0: deeper timing/statistics/protection reconstruction

Date: 2026-10-17. User explicitly chose immediate protections for all upgrades.

- Reused REA's retained original-package evidence and supplemented focused static
  callpath inspection. The public deep research report includes hashes, offsets,
  original behavior, unknowns and independent implementation decisions.
- Actual original-package test challenge ran in isolated Chromium with outbound
  requests blocked by an unreachable proxy. No personal profile or data was used,
  and the original onboarding consent was not accepted. Synthetic and keyboard
  events confirmed typo/bulk reset, but physical Backspace preserved a valid prefix.
- New unit tests cover schema2 migration, strict mutation guards, sequential tickets,
  pending-policy boundaries, multitab accounting, session statistics, CSV escaping,
  snapshot privacy and eligibility. `npm test`: 53/53 passed after review fixes.
- Source-loaded Chromium integration suite: 22/22 passed before focused review fixes.
- Build syntax/manifest checks and ZIP integrity checks passed.
- English/Chinese desktop and 390px narrow settings inspected; no horizontal overflow.
- Independent whole-change review reported three Important issues. All were reproduced
  and fixed: zero-budget escape, overnight weekday escape, missing-checkpoint session
  continuity. Focused review was clean; reviewer independently ran 36 targeted tests.
- Minor content polling feedback was addressed in the same fix wave by removing
  redundant storage listeners while retaining the existing five-second refresh.
- Package: 101,805 bytes, 24 files; SHA-256:
  `f7678a5f2ac96ea18c159e0a4e706ebedc2d7014b071ae4268a9e80948ce880c`.

The extracted v0.2.0 ZIP passed all 22/22 Chromium integration tests after the
review fixes. Remote CI and publication are pending at this commit; GitHub Actions
and the release page provide their final status. Full runtime timing parity with
the original extension is not claimed.


## 0.2.1 toolbar popup focus regression

A headed Chromium test opens the real toolbar popup with `chrome.action.openPopup`
and inspects its DOM through an isolated test CDP target. On macOS, the owning
window reports `focused: false` while the popup has focus. Previously this paused
accounting despite one-second UI polling. A short-lived focus report from a
Chrome-verified POPUP context now keeps the underlying active website eligible,
while existing idle, lock, minimized-window and heartbeat rules still apply.
Regular extension tabs cannot supply this focus override.

The regression test checks two successive countdown decreases and verifies system
lock stops the timer. Linux CI uses Xvfb for this headed test.

Local validation on 2026-10-20: 54 unit/package tests and 24 browser tests passed;
build and deterministic packaging passed. Running the same native-popup regression
against a temporary copy of the pre-fix production files failed as expected: the
display stayed at 600 seconds instead of decreasing below 598. This baseline run
controlled OS idle state, isolating the window-focus regression.


## 0.2.2 recovery and language preference

A stopped page-heartbeat browser test checks automatic script reattachment without
website navigation. This tests the recovery path, not a completed end-to-end
Chrome extension reload: the attempted reload probe did not deliver a replacement
worker event in the test harness. Personal-browser runtime validation remains pending.
A focused, Chrome-verified toolbar popup now supplies activity evidence even if
the page heartbeat has not recovered. Idle/lock rules still apply. Popup status
explains pauses and shows the running extension version.

Language selection saves only the locale immediately with a revision check. Other
settings drafts are preserved and are not included in this command. Tests check
popup translation without a separate settings save, rejected stale/untrusted
commands, and unchanged restriction settings.

Validation: 56 unit/package tests passed. The full browser run passed 25 tests;
the native-popup test paused after losing OS focus on the shared desktop. After
explicitly reactivating that real popup when focus is lost, its focused rerun
passed. Build and packaging passed. No browser API eligibility result is mocked
for this focus correction (the fixture fixes only physical OS idle state).


## 0.2.3 popup-only countdown

Removed website timer rendering and its settings checkbox. Legacy `showTimer=true`
imports cannot restore the overlay. Native-popup coverage checks continuous
countdown while open, then closes the popup and verifies background usage continues
without website timer UI. Heartbeat recovery and distraction hiding remain active.

Validation: 56 unit/package tests passed. Initial browser run passed 21 tests;
five accounting tests hit physical-host idle state. Normal browser fixtures now
explicitly set active OS idle state; dedicated idle/lock tests retain their own
controlled transitions. All five affected tests plus the native popup close test
passed in a focused six-test rerun. Build and packaging passed.


## 0.2.4 selected-group coverage in popup

The add button uses `matchesAny` on the current URL and selected group's patterns.
Covered pages show a disabled Already in this group label; changing the group or
current URL recomputes membership. The mutation handler also avoids covered adds.
New-group creation selects the resulting group before displaying the updated state.
The selector's neutral Website group label and button states support both locales.

Validation: 56 unit/package tests and 7 targeted browser tests passed, including
parent-domain/subdomain and path coverage, unmatched paths, group switching,
new-group selection, immediate language persistence, live popup polling and the
real native-popup countdown. Build, package and whitespace checks passed.

## 2026-10-21 — Usage visualization

- Reused REA module inventory/chart evidence and inspected the matching official
  StayFocusd 4.6.17 package. Static observations and reconstruction choices:
  `docs/research/stayfocusd-statistics-visualization.md`.
- `npm test`: 57 passed (including new daily-session, hourly-detail and empty
  filtered-summary assertions).
- `npx playwright test`: 27/28 passed initially. The failed legacy accessibility
  assertion exposed a missing chart-container accessible name; restored it.
- After that fix and a small axis-tick deduplication, ran
  `npx playwright test -g 'usage dashboard|live popup refresh'`: 2/2 passed.
  The full 28-test suite was not repeated after the focused correction.
- New integration coverage checks hourly points, percentages, metric sorting,
  daily session totals, filters, empty state, Chinese, 375px overflow and top-five
  plus Other aggregation. Synthetic screenshots inspected for desktop and narrow
  layouts; no personal usage records were read or exported.
- Final `npm run build`: 25 extension files validated.
  `git diff --check`: passed. No new dependencies or storage schema changes.
- No vendor populated-chart runtime parity claim. No remote CI or release run
  for this change. The previously requested blocked-title width fix remains
  in the working tree alongside this work.

## 2026-10-22 — v0.2.5 SPA accounting repair

- Reproduction and browser-message evidence:
  `docs/research/spa-timing-regression.md`.
- Red: no extension UI open, `pushState` navigation stopped persisted quota at
  73 ms; diagnostic repeat stopped at 123 ms. Fresh-tab control passed.
- Green: the same storage-only tests accumulated over seven seconds without any
  popup. `replaceState`/fragment heartbeats also passed; mismatched document
  identity was rejected.
- `npm test`: 57/57 passed. `npm run build`: 25 files validated.
- Full browser suite: 30/31 passed. The native-toolbar test failed after closing
  its popup. A diagnostic isolated run also encountered native focus loss.
  Added failure focus diagnostics and explicitly refocused the test browser after
  closing its popup. Isolated native-toolbar retest passed (14.7 seconds).
  No production popup-focus behavior was changed. The complete suite was not
  rerun after that fixture-only correction.
- Version bumped to 0.2.5 so the loaded fix can be identified. Existing installed
  timing files matched the pre-fix repository and host permissions were granted.
- The test fixture uses controlled idle state and a local SPA; the user's actual
  X browsing session was not replayed. Missing historical time is not backfilled.

## 2026-10-23 — v0.2.6 equivalent settings edits

- Design: compare validated settings excluding group names and interface language;
  compare group IDs and sorted rule sets to allow ordering/deduplication only.
  All other settings remain part of equivalence. No pattern-containment inference.
- Equivalent saves bypass challenge/confirmation and exhausted/focus locks through
  the shared assessment path; imports use that same path. Mixed policy changes
  retain existing checks. The focus-session Save button remains usable, with
  English/Chinese copy explaining the narrow exception.
- Regression tests failed before implementation for exhausted renaming and
  renaming combined with tightening. Existing language-challenge and nuclear
  tests now exercise actual restriction changes instead of equivalent saves.
- `npm test`: 59/59 passed. Coverage asserts preserved usage, pending changes and
  nuclear snapshot/deadline; rejects new group IDs and mixed relaxation.
- Browser checks: initial targeted 4/4 passed; final targeted 6/6 passed, covering
  exhausted rename with continuing enforcement, focus-session rename, mixed
  relaxation rejection, challenge/import, localization and confirmation behavior.
- `npm run build`, `npm run package` and `git diff --check`: passed.
  Package: `dist/open-stay-focused-0.2.6.zip` (25 files).
- Full browser suite and remote CI were not run for this focused change.

## 2026-10-23 — v0.3.0 animated otter reminders

- `npm test`: 63/63 passed, including exact 50%/80% durations, shared-group
  thresholds, ledger reload/reset, overlapping-group coalescing, old settings
  migration and non-restrictive preference edits during nuclear sessions.
- Initial full `npx playwright test`: 36/37 passed. One pre-existing assertion
  still required Save settings to be disabled in a nuclear session. Updated it
  to the previously approved behavior (equivalent edits remain saveable).
- Final focused `npx playwright test tests/browser/extension.spec.js -g
  'otter|popup unsupported-state'`: 4/4 passed. Covers the corrected assertion,
  foreground thresholds without any popup, expiry, quota-page persistence,
  dismissal, Chinese controls, actual changing head transform / foot animation,
  no subtree animations under reduced motion, and a running-then-closed audio
  context after a user click. Muting creates no replacement audio context.
- Full regression also covered SPA timing, recovery, native toolbar popup,
  statistics, settings protections, and private-storage isolation. The entire
  suite was not rerun after the focused fixes; only affected tests were rerun.
- `npm run build`, `npm run package`, `git diff --check`: passed.
  Package: `dist/open-stay-focused-0.3.0.zip`, 27 extension files.
- Visually inspected the rendered Chinese otter card in isolated Chromium.
  No personal Chrome extension runtime was automated; real speaker output and
  arbitrary websites' fullscreen/top-layer overlays were not manually verified.
- Browser autoplay may silence the synthesized chirp. The visual reminder still
  runs; an explicit Play chirp button provides a user-gesture fallback. No
  suspended sound is queued for later playback.

## 2026-10-25 — v0.3.1 local-file reading time

- `npm test`: 65/65 passed. New tests cover foreground-only file eligibility,
  loading/discarded/background/idle/locked/minimized exclusions, popup focus,
  generic path-free visit markers, aggregate statistics, filters and CSV.
- Focused browser regression: 9/9 passed, covering local PDF, website quota
  expiry, idle/unfocused accounting, bilingual UI, charts, live popup countdown,
  native toolbar popup, and automatic fresh-tab/SPA accounting without popup.
- Final local-PDF retest: 1/1 passed after narrowing the new filter option to
  the statistics selector. Verifies focus-session scopes remain unchanged.
- Local-file integration uses a real generated PDF opened as a file URL in an
  isolated Chromium profile. No extension page is open during initial counting.
  Storage polling verifies autonomous accumulation, idle/background pauses,
  resumed counting, no quota consumption, and no filename/path in local or
  session storage. The manifest still has only HTTP(S) host permissions.
- Local popup labels are checked with a controlled live-state response;
  the native-toolbar regression exercises website timing, not a native PDF popup.
- Browser idle state is controlled in tests. Polling keeps the worker observable;
  this does not establish long unattended service-worker suspension behavior.
- `npm run build`, `npm run package`, `git diff --check`: passed.
  Package: `dist/open-stay-focused-0.3.1.zip` (27 files).
- No full browser suite rerun, personal profile automation, file-content access,
  or Chrome Web Store submission. Reading time remains an estimate and pauses
  when Chrome reports 60 seconds of device inactivity.
