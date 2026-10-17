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
