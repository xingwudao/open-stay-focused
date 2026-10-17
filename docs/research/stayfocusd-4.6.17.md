# StayFocusd 4.6.17: reconstruction findings

Investigation date: 2026-10-17. Status: initial static investigation;
runtime parity has not been established.

## Target and evidence

- Installed Chrome extension: `laankejkbhbdhmipfmgcngdelahlfoji`.
- Installed package version: `4.6.17_0`; manifest version: `4.6.17`.
- Official listing: https://chromewebstore.google.com/detail/laankejkbhbdhmipfmgcngdelahlfoji
- REA root artifact SHA-256:
  `373bd721f7ac9e986c3f30f7b7d44bf913a97ffddc8f5f4867eb43d788a8ae10`.
- REA application evidence:
  `ev_98235a502b399bf612c2dec5a69ad5c6307b5260376e9eebada948785874169e`.
- REA summary evidence:
  `ev_d00d2f5a71b1b669eacb8122fc48b9360d27f27c69e19ca2e12adbe2a1338a68`.
- REA background module evidence:
  `ev_13996dcdbac03306c731015690623788e8f552b2dc621325d09ef004e38bc6ac`.
- Background file SHA-256:
  `64634ab7254fe30010dc17385acce5e258704d8d02b3674ec9dd449dcc02c017`.

REA examined 95 relevant files and parsed 79 JavaScript files without
parse failures. Its application and semantic coverage are partial:
expanded relationships exhausted result budgets, and usage-monitoring
semantic analysis exhausted its worker heap. Module syntax facts were
retained where available. These evidence IDs refer to the current REA
session; this document records the useful findings independently.

No original extension code, assets, personal browsing data, or settings
are redistributed in this repository. Analysis read the installed package.
The reconstruction will use independently written code and visual assets.

## Observations and boundaries

1. Architecture — answered statically.
   `manifest.json` declares Manifest V3, module service worker
   `background.js`, `popup.html`, and `options.html`.
   Content scripts handle usage monitoring, overlays, in-app blocking,
   and additional features. Vue component names and WXT-generated chunks
   are present; this does not establish the original source build setup.

2. Website groups and limits — partially answered.
   `chunks/blocked-sites-CakJr4mX.js` writes timer records containing
   `allowedTimeMs`, `blocklist`, `brandIds`, `isEnabled`, and a group name.
   An add-group path creates a group timer. This supports separate shared
   budgets for website groups, beyond a single global blacklist.
   Exact overlap precedence and URL normalization remain unverified.

3. Allowlist — partially answered.
   `chunks/whitelist-Bywu2un6.js` adds and removes stored URL patterns.
   Packaged walkthrough text describes allowing individual pages inside
   a blocked site. Wildcard and precedence edge cases require further
   function tracing or runtime probes.

4. Schedules and reset — partially answered.
   `chunks/active-time-D5qlAukP.js` contains active-day, multiple active-hour,
   and daily-reset controls. The background blocking loop consults the
   active-period state for ordinary timers. Overnight and DST semantics
   are not yet established.

5. Enforcement — answered as a static code path, not runtime proof.
   In `background.js`, `so` periodically evaluates timer state and
   blocking relation. The loop uses a one-second interval. It invokes
   `ho` for a block: that function either sends a blocking-overlay message
   for grouped/split-view tabs or navigates the selected tab to the vendor
   block page. `Rs` registers tab-activation/update and window-focus events.
   Service-worker suspension behavior and real-world timing accuracy
   have not been measured.

6. Nuclear option — partially answered.
   `chunks/nuclear-_v_sN_qL.js` has All, AllExceptAllowed and BlockedSites
   modes; Now, MaxTimeAllowedExceeded and SpecificTime start choices.
   `background.js` creates a nuclear timer with duration, start time,
   frequency, content type, and smart-bomb options. The blocking path
   exempts nuclear timers from ordinary active-hour gating.
   UI controls disable several edits during a nuclear session.
   Backend enforcement against every settings mutation is unverified.

7. Settings challenge — partially answered.
   `chunks/require-challenge-DmHtLaQF.js` exposes challenge enablement,
   configurable text, minimum-length and variation checks, and a test
   challenge action. Exact typing-error and paste semantics are unknown.

8. Usage statistics — partially answered.
   `background.js` configures a session monitor with recent-activity
   messages, an audio-active preference and database-backed sessions.
   It also configures an uploader gated by consent-related methods.
   Static configuration does not prove actual uploads or consent state.
   The reconstruction will retain only local per-domain usage totals.

9. In-app blocking — partially answered.
   The manifest targets YouTube, Facebook, Instagram, TikTok and X.
   `content-scripts/in-app-blocking.js` contains feature controls and
   DOM observation. Packaged UI text describes Shorts, recommendations,
   comments, feeds and similar controls. Compatibility with live site
   markup has not been tested.

10. Import/export — answered statically at UI/helper level.
    `chunks/settings-qqO8YvQZ.js` exports selected local/sync settings to
    JSON and imports snapshots followed by migrations. The open-source
    version will use its own validated schema, not claim file compatibility.

## Accepted product boundary

The user selected local core functionality with an independent interface
and MIT licensing. Account/device sync and AI-chat analytics are excluded.
The implementation must label its chosen semantics, rather than claiming
all original edge cases were recovered. Runtime comparison and testing of
our implementation remain outstanding. Publishing has not occurred.
