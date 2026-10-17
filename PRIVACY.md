# Privacy policy

Effective: 2026-10-17. Applies to Open Stay Focused 0.1.x.

Open Stay Focused has no backend, account, advertising SDK or analytics service.
The extension does not send settings, usage or page content to its developers.
Opening the repository/help link navigates to GitHub under GitHub's policies.
Websites you visit retain their own ordinary network behavior.

## Data on your device

Chrome local extension storage contains settings (including your language choice), per-group daily usage,
per-hostname daily statistics, and any scheduled/active focus session.
Statistics retain 30 local dates. Clearing statistics leaves the active budget
ledger and focus session intact. Removing the extension removes its local data.
Exported settings JSON contains your configured website patterns and rules;
share it only if you intend to share those choices.

While running, the extension reads current tab URLs to match rules and count
foreground time. The last checkpoint URL exists only in Chrome session storage,
which is not retained across browser restarts. Persistent statistics contain
hostnames rather than visited paths, queries, page titles, content or chats.
User-entered settings can contain paths because path rules are configurable.

## Permissions

- `storage`: save settings, quotas and local statistics.
- `tabs`: identify the active website and redirect blocked tabs.
- `alarms`: reconcile scheduled sessions and limits after background suspension.
- `idle`: pause foreground accounting while the computer is idle or locked.
- `webNavigation`: detect navigation, including single-page application routes.
- HTTP(S) host access: run activity heartbeats and optional distraction-hiding
  styles on websites, and enforce website rules.

Content scripts cannot access the private quota/statistics storage area.
They can request only distraction toggles and page checks from the background
worker. Settings mutations require extension-owned UI pages.

## Control and support

Use Settings to export/import rules or clear statistics. You can remove the
extension at `chrome://extensions`. Report privacy issues through the repository
without attaching personal browsing data. This project is independent of
StayFocusd and Sensor Tower; their policies do not apply to this extension.
