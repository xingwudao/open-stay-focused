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

1. Download `open-stay-focused-0.1.0.zip` from
   [Releases](https://github.com/xingwudao/open-stay-focused/releases).
2. Extract it into a folder you will keep on your computer.
3. Open `chrome://extensions`, enable Developer mode, then choose
   **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Pin Open Stay Focused and open **Settings** to add your first website group.

Requires Chrome 120 or newer. This first release is distributed through GitHub,
not the Chrome Web Store. To install from source, load the `extension/` folder.
When updating, replace the files in the same folder and click Reload in Chrome.
Keep that folder and extension ID stable to retain local settings and usage.

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
- Settings-only JSON import/export. Imports respect session and challenge locks.

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

Only the active tab in the focused browser window counts. Chrome's idle state
pauses accounting after 60 seconds without input. Background audio does not count.
Content heartbeats normally arrive every five seconds; enforcement can lag by
that interval. Gaps longer than 15 seconds are not charged, including most sleep
and suspended-page gaps. A browser restart preserves totals, not the unsettled
interval. This favors avoiding false charges over exact metering.

Nuclear sessions use an immutable snapshot of saved rules. They ignore active
hours. “All websites” ignores the allowlist; the other modes honor the snapshot
allowlist. Changes to unsaved forms do not affect a session. A future session
can be canceled before it starts. Clearing statistics never restores budgets.

## Limits of version 0.1

- Blocking redirects after navigation: a page can load or flash before it is
  replaced. This is a self-control tool, not a network firewall or parental control.
- Background tabs can be redirected when their URL is already blocked. Background
  pages and browser-protected pages do not count toward foreground usage.
- Chrome internal pages, extension pages and restricted domains where Chrome
  prohibits content scripts are outside reliable usage monitoring. Incognito
  is not monitored unless you explicitly allow the extension there.
- OS clock/timezone changes influence schedules. Disabling/uninstalling the
  extension or editing extension storage can bypass restrictions.
- Distraction controls are independently maintained CSS rules. They hide selected
  elements, not every feed route, and site redesigns may break them. Fixture
  verification is not a guarantee against current signed-in social-site layouts.
- No account/device sync, AI-chat collection, recurring nuclear schedules, or
  media-only nuclear mode. Original StayFocusd settings files are not compatible.

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
