# Privacy policy

Effective: 2026-10-23. Applies to Open Stay Focused 0.3.0.

Open Stay Focused has no backend, account, advertising SDK or analytics service.
The extension does not send settings, usage or page content to its developers.
Opening the repository/help link navigates to GitHub under GitHub's policies.
Websites you visit retain their own ordinary network behavior.

## Data on your device

Chrome local extension storage contains settings (including your language choice), per-group daily usage,
per-hostname daily/hourly statistics and session-start counts, pending settings
changes, any scheduled/active focus session, and otter-reminder preferences.
A separate local reminder ledger stores the most recent reminder budget date,
group IDs and the highest reminder milestone already shown for each group.
It prevents repeated milestone sounds/reminders across tabs and restarts.
It is replaced when a reminder is recorded for a new budget day; if no further
reminder is recorded, the last ledger remains until extension data is removed.
Statistics retain 30 local dates. Clearing statistics leaves the active budget
ledger and focus session intact. Removing the extension removes its local data.
Exported settings JSON contains your configured website patterns, custom challenge
text, language choice and rules. CSV exports contain selected hostname totals and
session counts;
share it only if you intend to share those choices.

While running, the extension reads current tab URLs to match rules and count
foreground time. It also observes tab visibility, browser focus, idle/locked
state and whether a tab is audible; it does not record microphone or system audio. The last checkpoint URLs (including eligible audible tabs) exist only in Chrome session storage,
which is not retained across browser restarts. Persistent statistics contain
hostnames rather than visited paths, queries, page titles, content or chats.
User-entered settings can contain paths because path rules are configurable.

## Permissions

- `scripting`: reconnect the extension’s bundled content scripts on already-open
  websites after an extension reload, within the same granted HTTP(S) host access.
- `storage`: save settings, quotas and local statistics.
- `tabs`: identify the active website and redirect blocked tabs.
- `alarms`: reconcile scheduled sessions and limits after background suspension.
- `idle`: pause foreground accounting while the computer is idle or locked.
- `webNavigation`: detect navigation, including single-page application routes.
- HTTP(S) host access: run activity heartbeats and optional distraction-hiding
  styles and optional animated budget reminders on websites, and enforce website rules.

Content scripts cannot access the private quota/statistics storage area.
They can request only distraction toggles, activity heartbeats and current-page
checks/totals from the background worker. A milestone response also contains the
applicable group name, reminder duration and language/sound preferences so the
reminder can be rendered in the page. Group names shown in a reminder become
part of that page’s DOM; do not use confidential information in group names. Settings mutations require extension-owned UI pages.

## Local-only use and sharing

Browsing activity is processed only to provide the user-facing website budgets,
blocking, local usage reports and budget reminders. The extension does not sell
user data, transfer it to third parties, use it for advertising, or use it for
creditworthiness or lending decisions. Its use of information received from
Chrome APIs complies with the Chrome Web Store User Data Policy, including the
Limited Use requirements.

Distraction controls apply bundled CSS to selected website elements. They do
not save or transmit page text, posts, messages or form entries. Otter artwork,
animation and synthesized sound run locally; no images or audio are fetched.
There is no remote code, telemetry, cloud synchronization or developer access
to users’ local records. Chrome storage is not an encrypted vault supplied by
this extension; someone with access to the device/profile may access its data.

Exported files are saved to a location selected by the user and remain there
after uninstalling unless the user deletes them. Browser backups or device
backups are controlled by the user and the browser/operating system.

## Control and support

Use Settings to export/import rules or clear statistics. You can remove the
extension at `chrome://extensions`. Report privacy issues through the repository
without attaching personal browsing data. This project is independent of
StayFocusd and Sensor Tower; their policies do not apply to this extension.

Support and privacy questions: https://github.com/xingwudao/open-stay-focused/issues
