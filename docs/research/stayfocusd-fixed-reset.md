# StayFocusd fixed daily reset — 2026-10-26

User decision: retain fixed reset times; do not infer sleep.

## Source and confidence

Inspected the official Chrome update-service CRX for StayFocusd 4.6.18,
extension ID `laankejkbhbdhmipfmgcngdelahlfoji`.
This is static shipped-code evidence, not an overnight runtime experiment.
REA parent evidence:
`ev_05f280c417e9effff7e8d60d1ba4e6f6d3276f92bf30c2ab7db6ab1cd170cef4`.
Directory digest: `03933224b9d14696b522610aeb7d64fd9243a27413c7dab96600d0d2f951d93f`.
REA reported 79 parsed JavaScript files, no parse failures, but partial semantic
coverage due to heap/time/result limits. Findings below were checked directly
in the relevant shipped source; the analysis is not an exhaustive absence proof.

Source file SHA-256:
- `background.js`: `5d721b4c1b9917941be8a09138d0f83f645e8c7304a0b64738bd4dae19923879`
- `chunks/_virtual_wxt-plugins-BnolbElr.js`: `4bad357a10af3140f6aad278c4914a7c1c8b80a97a7ca2de3efc2ad03feb157c`
- `chunks/help-DuxgKYc_.js`: `eef93eafd45d137f70697df309a1f4b9a28b52c23bd515f59b4e30abf2a1c84f`

## Observed behavior

- `_virtual_wxt-plugins-BnolbElr.js`: `BJe={hours:3,minutes:0}`;
  `Lp=ke(ie.ResetTime,{fallback:BJe,version:2,...})` connects this default
  to persisted reset settings. Existing settings take precedence.
- `background.js`: `Ci()` builds `0 ${minutes} ${hours} * * *`;
  `to()` registers the `daily-reset` cron job. `fi()` compares the saved
  last reset with the relevant local reset boundary on startup.
  `Nn()` applies eligible queued changes, stores last reset and emits `dailyReset`.
- Help explicitly recommends early morning (e.g. 05:00) for night owls.
  It explains the change delay prevents moving the reset to one minute after
  exhaustion. Its claim that the default is midnight conflicts with the actual
  fallback above; code is the basis for the 03:00 default here.
- The inspected reset path uses clock boundaries, not a signal of human sleep.
  It will renew the allowance at the configured time even if the person is awake.

## Repository changes

The existing `budgetDay` and accounting boundary split already implement fixed
local reset periods without deleting historical statistics or needing an alarm
to erase counters. Reuse them rather than add another reset mechanism.

- New settings default to 03:00 (`resetMinute:180`).
- Saved settings, including midnight and custom times, remain unchanged.
- English/Chinese settings and READMEs explain fixed time, midnight behavior,
  how to choose a later time, and calendar-date statistics.
- Existing delayed setting changes and anti-circumvention checks remain active.
- Statistics retain calendar-date buckets; allowance renewal does not erase history.

## Verification

`npm test`: 68 passed. Added coverage for midnight without quota renewal,
03:00 split during continuous browsing, restart before/after the boundary,
no offline charge, historical preservation and custom reset settings.
Existing tests cover DST and queued reset changes surviving restart.
`npm run build`: validated all 27 extension files.
No overnight live-browser run, Chrome Store upload, commit or push in this change.
