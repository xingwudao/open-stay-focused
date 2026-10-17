# Open Stay Focused

A little less noise. A little more room for what matters.

An independent, local-first Chrome extension for website budgets, committed
focus sessions, and distraction controls. MIT licensed. No account, telemetry,
subscription, or remote runtime code.

This project is not affiliated with StayFocusd or Sensor Tower. It was built
independently following a bounded analysis of the installed StayFocusd 4.6.17
package. No vendor code, graphics, or text are included.

![Settings interface](docs/images/settings.png)

## Install

1. Download `open-stay-focused-0.2.0.zip` from
   [Releases](https://github.com/xingwudao/open-stay-focused/releases).
2. Extract it into a folder you will keep on your computer.
3. Open `chrome://extensions`, enable Developer mode, then choose
   **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Pin Open Stay Focused and open **Settings** to add your first website group.

Requires Chrome 120 or newer. Releases are distributed through GitHub,
not the Chrome Web Store. To install from source, load the `extension/` folder.
When updating, replace the files in the same folder and click Reload in Chrome.
Keep that folder and extension ID stable to retain local settings and usage.

## Language / 语言

Open Settings and choose **English** or **简体中文** using **Language / 语言**
at the top, then save. Popup, settings and blocked pages use the saved language
when opened. Existing settings default to English.

打开设置页，在顶部的 **Language / 语言** 选择 **简体中文** 或 **English**，
然后点击 **保存设置 / Save settings**。新打开的弹窗、设置页和拦截页会使用已保存的语言。
切换语言不会清空使用记录或重置额度；专注锁定和输入挑战仍然生效。

## What changes in 0.2

Existing installations immediately receive the commitment protections below.
Your rules, consumed budgets and usage history are preserved. Typing challenges
are enabled on upgrade; turning them off requires completing the current challenge.

- One-second popup and optional movable page countdown, plus the website's daily usage.
- Optional background-audio tracking; same-host and shared-group concurrent visits
  count once. Different audible hosts may add up to more than wall-clock time.
- Today, 7-day and 30-day summaries, session counts, hourly/daily charts, filters,
  hostname search and local CSV export. Older totals remain, but historical hourly
  detail and session counts cannot be reconstructed from older aggregate data.
- Purely stricter edits work without typing; relaxing or mixed edits require the
  saved challenge. Wrong input, deletion, paste and drop restart typing; Chinese
  composition is supported. Custom text requires 250 characters and 5 distinct
  characters after normalization; previews use the same validation.
- A positive-budget group with at most one second remaining cannot be relaxed
  during active hours. Group removal, disabling, renaming, raising allowance,
  removing patterns and new allowlist entries are guarded centrally, including imports.
- Today's active weekday cannot be removed. Active-hour and reset-time edits apply
  at the same local time tomorrow (23/24/25 elapsed hours around DST). The current
  and pending values are shown; new queued edits restart the delay. Saving unchanged
  effective values does not cancel a pending change.
- Budget increases require 2 confirmations, or 8 with at most 3 minutes left.
  Group deletion and immediately blocking reductions require confirmation.
  Pausing requires 10 confirmations. Pause/quick-allow controls are hidden by default;
  a hidden pause control cannot be revealed while budgets are exhausted or nuclear
  focus is active. Zero-minute groups remain editable through challenge/escalation.

See the [deep research report](docs/research/stayfocusd-timing-statistics-friction.md)
for source evidence, actual runtime probes, original defects and deliberate differences.

## What it does

- Shared daily budgets for website groups, including immediate blocking at zero.
- Domain and page-path patterns, with an allowlist for pages you still need.
- Active weekdays, multiple time windows, overnight schedules and a local reset time.
- Immediate or scheduled nuclear sessions: grouped sites, all except allowed,
  or all HTTP(S) websites. An active session cannot be canceled in the UI.
- An optional typing challenge before settings changes.
- Local foreground-usage totals by hostname, retained for 30 local dates.
- YouTube Shorts, recommendations and comments controls; selected Instagram
  and Facebook Reels links, X trends and TikTok recommendations controls.
- Settings-only JSON import/export. Imports respect all mutation guards and queues.
  Pending queues stay on this installation and are not included in settings exports.

## Rules you can understand

`example.com` matches the domain and its subdomains, never `notexample.com`.
`example.com/work` matches that exact path. `example.com/work/*` matches paths
under that prefix. Hosts are case-insensitive; paths are case-sensitive.
An optional `http://` or `https://` prefix does not restrict the scheme.
Patterns cannot contain ports, credentials, queries or fragments. Query strings
and fragments do not affect matching. A domain pattern applies at any port.

Each matching group consumes its own shared budget. Any exhausted group blocks.
Allowlisted pages consume no group budget. Regular budgets apply only during
active hours; local usage statistics also include time outside those hours.
Overnight windows belong to their starting weekday. All times follow your
computer’s local timezone; reset days use calendar dates, including DST.

By default only the active tab in the focused browser window counts. Chrome's idle
state pauses foreground accounting after 60 seconds without input. Optional audio
tracking also counts audible background tabs; system lock pauses all accounting.
Foreground heartbeats and active monitoring normally update every second; Chrome
can throttle or suspend callbacks, so this is not a hard real-time guarantee. Gaps longer than 15 seconds are not charged, including most sleep
and suspended-page gaps. A browser restart preserves totals, not the unsettled
interval. This favors avoiding false charges over exact metering.

Nuclear sessions use an immutable snapshot of saved rules. They ignore active
hours. “All websites” ignores the allowlist; the other modes honor the snapshot
allowlist. Changes to unsaved forms do not affect a session. A future session
can be canceled before it starts. Clearing statistics never restores budgets.

## Limits

- Blocking redirects after navigation: a page can load or flash before it is
  replaced. This is a self-control tool, not a network firewall or parental control.
- Background tabs can be redirected when their URL is already blocked. Background
  pages and browser-protected pages do not count toward foreground usage.
- Chrome internal pages, extension pages and restricted domains where Chrome
  prohibits content scripts are outside reliable usage monitoring. Incognito
  is not monitored unless you explicitly allow the extension there.
- OS clock/timezone changes influence schedules. After a backward clock change,
  accounting pauses until the previous checkpoint time is reached again. Disabling/uninstalling the
  extension or editing extension storage can bypass restrictions.
- Distraction controls are independently maintained CSS rules. They hide selected
  elements, not every feed route, and site redesigns may break them. Fixture
  verification is not a guarantee against current signed-in social-site layouts.
- No account/device sync, AI-chat collection, recurring nuclear schedules, or
  media-only nuclear mode. Original StayFocusd settings files are not compatible.
- Statistical website filters classify the hostname root under current saved rules;
  path-specific history is not retained. Budget changes do not retroactively reclassify
  earlier visits, and quota accrual remains restricted to active hours.

See [privacy](PRIVACY.md), [architecture](docs/architecture.md),
[research findings](docs/research/stayfocusd-4.6.17.md), and
[verification record](docs/verification.md).

## Develop and verify

Requires Node.js 22 or newer. Runtime code has no npm dependencies.

```sh
npm ci
npx playwright install chromium
npm test
npm run test:browser
npm run build
npm run package
```

On Linux CI, install browser system dependencies with
`npx playwright install --with-deps chromium`.
Tests launch isolated Playwright Chromium profiles, never your personal Chrome
profile. Unit tests exercise injected clocks/storage; integration tests load
real extension pages and content scripts. Build checks manifest references and
JavaScript syntax. Packaging emits a deterministic ZIP and `dist/SHA256SUMS`.

## Contribute

Bug reports should include browser version, minimal rules and expected/actual
behavior. Do not upload browsing history or personal settings. See
[CONTRIBUTING.md](CONTRIBUTING.md). Source and original artwork are MIT licensed.
