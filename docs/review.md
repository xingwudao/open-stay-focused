# Release review and decisions

A single independent reviewer examined the implementation at `3532110`,
read the design and plan, ran the pure test suite and reproduced targeted
issues in Node and isolated Chromium. It reported no Critical issues and
four Important issues. The author then reproduced each issue with a failing
regression and applied a focused fix pass.

- Wildcard path handling: process `*` before literal equality. Regression
  includes an asterisk inside the visited path and a policy-level block.
- Clock rollback: keep checkpoint time at its high-water mark across rollback,
  catch-up and worker recreation. No charged wall-clock interval is replayed.
- Stale drafts: keep the editor's baseline revision separate from refreshed
  statistics state; a two-page regression rejects overwriting newer settings.
- Retention: prune on state access and idle reconciliation and persist before
  returning. Regressions cover idle reopening and midnight date changes.

Focused regression runs passed after the fixes. Full-suite and packaged-artifact
results are recorded in `verification.md`. There was no second independent
whole-branch review and no deferred minor finding from the reviewer.

Additional coverage addresses quick-add through the real popup document and
controller (with a controlled active-tab query), plus Chrome adapter idle/focus
transitions (with controlled OS API responses). The native toolbar popup itself
is not exposed as a Playwright page by headless Chromium.

## Execution decisions and limits

- Work stayed in the requested repository on a feature branch. A separate
  worktree was unnecessary for the initially empty project; isolation was at
  the branch level.
- The Chrome adapter computes foreground eligibility and passes one boolean
  to the controller. Incorrect browser API responses remain an adapter risk;
  tests cover foreground, idle and unfocused responses explicitly.
- Distraction preferences are polled every five seconds, so changes may take
  that long to appear on an already-open page.
- After wall-clock rollback, accounting pauses until the previous checkpoint
  time. This prevents double charging but can undercount during catch-up.
- Signed-in social layouts, physical OS sleep/lock, and Chrome 120 specifically
  were not exercised. Controlled fixtures and current Playwright Chromium
  provide the recorded evidence, not a universal compatibility guarantee.
- Post-navigation blocking and browser-level disabling/storage tampering remain
  the documented limits of a self-control extension.
- Public GitHub source and release publication were explicitly authorized.
  Chrome Web Store submission is outside this release.
