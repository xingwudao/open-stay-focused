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

The first release uses post-navigation redirect enforcement, not declarative
network rules. This keeps rule semantics in one engine but allows a brief flash
of content. Foreground heartbeats normally bound enforcement delay to five
seconds. Alarms reconcile suspended/background conditions about every 30 seconds;
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
