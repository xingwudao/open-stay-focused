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
