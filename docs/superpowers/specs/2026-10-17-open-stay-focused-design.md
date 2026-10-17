# Open Stay Focused: first release design

Status: proposed architecture for user review. Product scope approved;
implementation has not started.

## Objective and scope

Build an independently implemented, MIT-licensed Chrome extension in this
directory and publish the source and installable ZIP on GitHub.
Name: Open Stay Focused. No affiliation with StayFocusd or Sensor Tower.
The user approved local core features, independent visuals, and MIT.
Account sync and AI-chat analytics are excluded from version 0.1.0.
Chrome Web Store submission is a separate distribution step requiring
an identified developer account and listing assets; GitHub publication
is the initial release destination.

## Implementation approach

Use Manifest V3 and plain JavaScript ES modules with a small build/package
script. Separate a pure policy engine from Chrome API adapters and UI.
Use the Node test runner for policy tests and browser automation for
actual extension flows. Avoid a frontend framework for this small UI.

Alternatives considered: a Vue/WXT application offers richer frontend
tooling but adds dependencies; a declarative-only blocker cannot provide
the required foreground usage accounting on its own. The recommended
design combines persisted accounting with event-driven enforcement.

## Core semantics

- Website groups have names, enabled flags, domain/path patterns and daily
  budgets. Multiple matching groups all accrue usage; any exhausted group
  blocks. A domain matches itself and subdomains on hostname boundaries.
  Path patterns use an explicit documented wildcard syntax. Invalid
  schemes and patterns are rejected before settings are stored.
- Allowlist matches override ordinary group blocks. Nuclear All ignores
  the allowlist; AllExceptAllowed honors it; BlockedSites blocks matching
  enabled group patterns while honoring the allowlist.
- Count only the active HTTP(S) tab in the focused browser window while
  the user is active. Do not count background audio in the first release.
  Active-day/hour schedules control ordinary budget consumption and
  enforcement. Local domain statistics record foreground usage separately.
- Daily budgets reset at a configurable local time, default midnight.
  Overnight schedule intervals belong to their start day. Derive local
  calendar boundaries rather than assuming every day is 24 hours.
- A nuclear session starts immediately or at a selected future time and
  has a fixed end timestamp. Expose the three block modes. Once active,
  the UI cannot cancel it or weaken the captured policy. Restarting Chrome
  does not end it. Recurring nuclear schedules and selective media-only
  nuclear blocks are deferred and explicitly documented as differences.
- An optional typing challenge protects settings edits. Use original
  challenge text, reject paste, and require an exact match. Validate the
  challenge through the trusted extension worker before accepting writes.
- Show today's remaining group budgets and recent per-domain usage.
  Keep local daily totals for 30 days; retain no page titles, query strings,
  page content or AI conversations. Support clearing statistics without
  resetting current enforcement budgets or active nuclear state.
- Provide independently authored toggles for YouTube Shorts, recommendations
  and comments, Instagram Reels, Facebook Reels, X trends, and TikTok
  recommendations. Treat site selectors as best-effort adapters with
  fixture coverage and clearly state live-site compatibility limits.
- Import/export uses a versioned settings schema with size limits and
  validation. Imports go through the same edit protections as UI changes.
  Do not import usage or nuclear state to bypass restrictions.

## Components and data flow

`extension/core/` owns URL matching, schedules, quota decisions, validation,
and accounting. `extension/background.js` serializes mutations, validates
message senders, handles tab/window/navigation/idle events and alarms,
and writes checkpoints to `chrome.storage.local`.

Content scripts provide activity heartbeats, SPA navigation checks and
distraction hiding. The worker verifies sender tab/frame and uses browser
tab state for accounting. Elapsed intervals are bounded to avoid charging
sleep or missing-heartbeat gaps. Timers are wake-up aids, not the source
of truth. Worker restart reloads settings, budgets, and nuclear timestamps.

`extension/ui/` contains popup, settings/dashboard and a local block page.
The popup shows current-site status, remaining time and an add-site action.
The settings page contains groups, allowlist, schedule, nuclear mode,
challenge, statistics, distraction controls and import/export.
Use a readable responsive layout, keyboard-accessible controls and clear
validation errors. All messages are rendered as text rather than HTML.

Use browser navigation rules where appropriate for already-blocked URLs,
and event/content enforcement for current pages and SPA transitions.
Explicitly test any rule translation against core matcher semantics.
Do not describe this self-control tool as tamper-proof: extension disabling,
uninstallation and direct developer storage edits remain browser capabilities.

## Permissions and privacy

Request only permissions used by implementation: storage, tabs, alarms,
idle, webNavigation, HTTP(S) host access, and declarativeNetRequest if
navigation rules are implemented. No identity, remote analytics or remote
runtime code. Explain host access for site blocking and DOM hiding.
Store data locally. Package original icons and an original visual identity.

## Acceptance criteria

1. Chrome loads the unpacked extension without manifest or worker errors.
2. Group quota expiry blocks both a newly opened URL and an existing tab.
3. Host boundaries, subdomains, paths, allowlist and overlapping groups
   follow the specified precedence.
4. Tab switches, unfocused windows, idle periods, sleep, worker restarts,
   browser restarts, reset boundaries and overnight schedules do not
   duplicate usage or reset an active nuclear session.
5. Nuclear modes and settings/import challenge protections are tested
   through actual message handlers, including rejected bypass attempts.
6. Distraction toggles work in controlled DOM fixtures and update without
   a page reload. Record which real sites were actually checked.
7. UI smoke tests cover creating a group, importing/exporting settings,
   starting a session and viewing the blocked page.
8. Test/build/package commands succeed and the ZIP contains only extension
   assets. Include README, LICENSE, privacy policy, architecture notes,
   known limitations, research findings and release instructions.
9. Publish to a public `open-stay-focused` GitHub repository and create a
   versioned release with the tested ZIP. Verify remote commit/tag/assets.
   Report local testing, remote CI and publication separately.

## Publication discovery

The current directory is empty and has no Git repository or remote.
Authenticated GitHub CLI account: `xingwudao`. Lookup of
`xingwudao/open-stay-focused` returned not found. Proposed destination:
create that public repository after implementation and validation, under
the user's request to publish an open-source version.
