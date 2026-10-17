# Architecture and implementation decisions

The pure `core/` modules validate settings, match domains/paths, evaluate schedules
and calculate usage. `controller.js` serializes state transitions and commits
only after successful storage writes. Its injected clock/storage support exact
boundary and failure tests.

`background.js` registers listeners synchronously, queries browser tab/focus/idle
state, samples the previous interval and evaluates current rules. Chrome local
storage persists quotas. A full checkpoint URL is stored only in session storage;
its timestamp must match the authoritative local checkpoint to be restored.
Lost session cache can lose a small unsettled interval but cannot replay one.

Content scripts send top-frame heartbeats and request only distraction settings.
The worker derives tab identity and URL from Chrome, checks document freshness,
and denies settings or statistics commands from content contexts. Local storage
is restricted to trusted extension contexts. An independent CSS adapter hides
selected elements; CSS naturally applies to DOM nodes inserted later.

An active nuclear session blocks settings/import writes and uses a rule snapshot.
The challenge is friction, not a security boundary against the device owner.
Stats and budget usage are separate so clearing charts does not restore time.
Settings revisions prevent an old open editor from overwriting newer settings.

The UI consists of local HTML/CSS/ES modules. All user data enters the DOM as text
or input values. No remote scripts, fonts, icons or third-party runtime libraries
are loaded. Original icons are generated geometric artwork.

## Deliberate limits

The extension uses post-navigation redirect enforcement, not declarative
network rules. This keeps rule semantics in one engine but allows a brief flash
of content. In v0.1 foreground heartbeats normally bounded enforcement delay to five
seconds; v0.2 adds one-second sampling as described below. Alarms reconcile suspended/background conditions about every 30 seconds;
Chrome may delay them. No claim of exact real-time execution is made.

The plan's `tick` adapter is simplified to a verified `eligible` boolean; the
Chrome adapter owns focus/idle/fresh-heartbeat decisions. Pure interval accounting
rejects gaps over 15 seconds and splits valid intervals on wall-clock seconds.
Minute-aligned schedules and resets are therefore split without assuming a
24-hour local day.

## Reference documentation

- [Chrome worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Playwright extension testing](https://playwright.dev/docs/chrome-extensions)

Chrome may terminate an idle worker. Durable state is consequently authoritative;
interval timers are not the source of truth. Integration tests use Playwright's
bundled Chromium with isolated persistent contexts, including restart tests.

## Review corrections

The accounting checkpoint keeps a timestamp high-water mark when the wall clock
retreats, preventing replay of already charged intervals. History pruning runs
on state access and idle reconciliation as well as ordinary accounting, and is
persisted before exposing a cleaned state. The editor keeps its own settings
revision, independent of statistics refreshes. Only a settings write increments
that revision; clearing statistics or starting a session does not replace an
unsaved draft. Wildcard matching handles '*' before literal equality so URLs
containing a literal asterisk retain the expected glob semantics.

## Version 0.2: live accounting, statistics and commitment guards

The Chrome adapter now samples eligible tabs each second while tracking is active,
plus navigation/focus/idle events. Foreground content heartbeats arrive once a second;
alarms remain the suspension fallback. Optional audible tabs can count concurrently.
A locked system pauses all tracking. `core/tracking.js` derives eligibility from Chrome
state, never from an untrusted payload. The page-timer response contains only the
current page's display flags, duration and remaining allowance; it exposes neither
other sites nor the settings object. Floating UI lives in its own Shadow DOM.

`accountIntervalMany` unions qualifying hostnames and group IDs for each settled
interval. Each host and matching group receives at most one copy of its timestamp
delta, even if several qualifying tabs match. Statistics always count eligible time;
quota additionally requires enabled restrictions and an active schedule. Daily and
hourly bins use local calendar boundaries. `sessionCounts`, `hourly` and `activeHosts`
augment legacy daily totals; no full browsing-path ledger is retained. A lost runtime
checkpoint ends continuity rather than inventing time or merging sessions across restart.

Popup, settings statistics and floating timer refresh once per second from settled
authoritative state. Refreshes never replace a dirty settings draft or its revision.
This implementation checkpoints aggregate ledgers during samples; it does not copy
StayFocusd's broader IndexedDB page-view and analytics schema. Performance and callback
throttling are limits, not guarantees of hard real-time execution.

`core/protections.js` classifies writes and guards exhausted commitments, active days,
hidden pause controls and nuclear sessions. Pure tightening can use limited editing;
other settings writes require the currently saved challenge. Strict typing is a UI
friction mechanism, not authentication against someone controlling their browser.
Hard commitment rules are checked in the controller for every entry, including imports.
Sequential confirmation tickets bind to normalized operation, current revision and a
five-minute lifetime; successful application consumes them. A retry after a storage
failure retains its ticket. Persistence remains atomic at the controller state boundary.

Schema 1 settings migrate to schema 2 with challenges enabled and escape controls
hidden, preserving quotas and histories. Changes to active intervals/reset time are
queued until the next local calendar date at the same clock time. The controller
settles old intervals before policy mutation, and splits at a pending apply boundary;
its existing 15-second freshness cap prevents accounting offline gaps. New edits
replace the corresponding queue, unchanged-effective saves do not cancel it, and
imports cannot supply queue state. Pending application increments the revision.

Settings and CSV exports are separate: settings JSON contains effective configuration,
not history, live timers or pending queues; CSV contains only selected hostname totals
and session counts. Filters classify current hostname roots because path history is
intentionally absent. CSV fields are escaped against spreadsheet formula injection.
