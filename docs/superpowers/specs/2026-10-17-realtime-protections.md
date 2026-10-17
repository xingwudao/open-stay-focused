# Real-time usage and mandatory commitment protections

User confirmed: all users receive protections immediately on upgrade. No optional
strict-mode bypass. Preserve local-only scope, Chinese/English, MIT independent code.
The research notes are in `.superpowers/deep-research/` and a public report will
record evidence without redistributing original code.

## Product decisions

- One-second authoritative countdown in popup and optional in-page floating timer.
  Use timestamp deltas, never a callback counter. Browser throttling is not exact time.
- One active session per hostname, deduplicate concurrent same-host pages and charge
  each matching group once per elapsed interval. Optional audible background tracking
  defaults off (existing foreground-only contract); normal foreground remains OS-idle aware.
- Keep current active-hours-only budget accrual, calendar boundary splitting, and
  nonretroactive budgets. Do not acquire persistent page paths/queries to retroactively
  charge new groups. Domain statistics include eligible time outside active hours.
- Domain durations, session starts, today/7/30-day views, hourly/day chart, local CSV
  export. Retain 30 local dates. Clearing statistics cannot restore quota.
- Schema v2 migrates v1: enable typing challenge, preserve existing groups/quotas,
  require new protection policy immediately. Default challenge text is independently
  authored in each language; custom normalized text >=250 code points, >=5 distinct.
- Exhausted positive-budget groups cannot increase allowance, disable, rename,
  delete or remove patterns during active hours. Block allowlist additions while any
  positive budget is exhausted. Zero-budget groups may be changed with challenge
  and escalation so they never become permanently uneditable.
- Cannot remove today's active weekday. Changes to intervals/reset queue until the
  same local time tomorrow; queue survives restart, replacement restarts delay.
  Imports use identical guards and cannot erase pending changes.
- Changes that only tighten restrictions may proceed in limited mode without typing;
  other changes require the saved challenge when enabled. Disabling challenge or
  changing its text also requires the current challenge.
- Wrong character, deletion, paste/drop reset strict challenge; support Chinese IME
  composition without falsely resetting partial composition. Preview/test available.
- Increase budgets: 2 confirmations normally, 8 when <=180000ms remains; lowering
  below consumed time asks immediate-block confirmation. Deactivation: 10 confirmations.
  Sequential confirmation tickets must be issued by controller and bound to mutation
  and settings revision. Imports/quick actions share the same command path.
- Hide pause/quick-allow controls by default; revealing a hidden pause control is
  forbidden while exhausted or nuclear. Active nuclear settings/import lock remains.
- No original vendor code, prose, icons, telemetry, remote accounts, ads or AI collection.
  No copying of demonstrated original bugs (unit errors, double counting, weak import).

## Acceptance

Unit tests pin migration, each guard, confirmations, pending changes, expiry, clock
boundaries, deduplication and statistics. Real Chromium verifies popup/floating live
updates, strict typing/IME, language support, delayed edits, and import bypass denial.
Independent review, full local suites, extracted ZIP checks and remote CI precede
v0.2.0 publication under the existing publishing authorization.
