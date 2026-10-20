# Usage guide and upgrade notes

Since 0.2.3, countdown display is confined to the toolbar popup. The former page
floating timer is removed, including for existing installations. Background usage
tracking continues when the popup closes. The 0.2 notes below describe its history.

[English overview](../README.md) · [中文概览](../README.zh-CN.md)

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

See the [deep research report](research/stayfocusd-timing-statistics-friction.md)
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

See [privacy](../PRIVACY.md), [architecture](architecture.md),
[research findings](research/stayfocusd-4.6.17.md), and
[verification record](verification.md).


## Visual usage dashboard

In Settings → Your usage, select today, the last 7 days or the last 30 days.
All cards, charts, ranking rows and CSV exports follow the same website filter
and search. Switch the metric between visit duration and session count.

- Daily trend shows one point per local calendar date.
- Hourly pattern sums duration in the same clock hour across the selected dates.
  The initial view shows today's hourly pattern.
- Website share shows the top five websites plus Other websites. The full ranking
  and expandable chart values include every website.
- Hover or focus a chart point for its accessible exact value; open View chart
  values to read all data without relying on colors or a pointer.

A session is a continuous eligible period for a hostname, not a page-view count.
Hourly session counts are not stored, so session trends use daily counts. Older
records without hourly duration remain in totals but cannot populate hourly
charts or the busiest-hour card. A note identifies that limitation. History uses
local calendar dates, independently of budget reset time. Optional background
audio can make summed website duration exceed elapsed wall time.
