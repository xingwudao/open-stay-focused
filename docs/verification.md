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
