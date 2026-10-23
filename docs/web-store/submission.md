# Chrome Web Store submission — Open Stay Focused 0.3.0

Status: materials prepared. Not uploaded, not submitted, not approved.
The browser automation tool returned `Not allowed` when opening the developer
console. The owner confirmed that they have a developer account and can upload.
No developer-console state or item ID has been inspected.

## Files to upload

- Extension ZIP: `dist/open-stay-focused-0.3.0.zip`.
  Upload this file, not the repository ZIP or the entire materials directory.
- Icon: `docs/web-store/images/icon-128.png` (128 × 128 PNG).
- Screenshots: four `*-en.png` files in `docs/web-store/images`.
  Each is 1280 × 800. Chinese equivalents are supplied as `*-zh-CN.png`.
- Description: paste `listing-en.txt`; `listing-zh-CN.txt` is the Chinese copy.
- All these files are also copied into `dist/chrome-web-store-0.3.0/` for handoff.

The screenshots use actual v0.3.0 interface rendering with synthetic local data
in a disposable Chromium profile. They do not show personal browser history.
Recreate them with `node scripts/store-screenshots.mjs`.
No optional promotional artwork is included; the official image guide currently
requires a store icon and at least one screenshot.

## Listing fields

Name: Open Stay Focused

Short description (same as the manifest):

Local, open-source website budgets, focus sessions and distraction controls. Your browsing data stays on your device.

Chinese short description, if adding a translated listing:

免费开源的网站额度与专注工具：共享计时、本地统计、水獭提醒和干扰隐藏。无需账号，浏览数据保存在设备上。

Default language: English. The extension also includes Simplified Chinese.
Category: select the available productivity / workflow category that fits
website time management. Free, public distribution, all available regions.
Use automatic publication after approval if the dashboard offers that choice.
No in-app purchases, advertising or external subscription.

Homepage:
https://github.com/xingwudao/open-stay-focused

Support:
https://github.com/xingwudao/open-stay-focused/issues

Privacy policy:
https://github.com/xingwudao/open-stay-focused/blob/main/PRIVACY.md

Developer contact, verified email, legal/trader identity and any account-specific
attestations must use the owner's actual information. Do not invent these.

## Single purpose

Help users manage distracting website use with locally enforced time budgets,
focus sessions, usage reports and reminders. All functions support this single
purpose; no browsing data is transmitted to the developer.

## Permission justifications (paste into the corresponding fields)

### storage

Stores user-defined website rules, shared budget usage, local hostname usage
statistics, scheduled focus sessions and milestone-reminder deduplication.
Uses local/session extension storage only, not cloud sync. Access is restricted
to trusted extension contexts.

### tabs

Reads current tab URLs and active/audible state to identify the website receiving
time, display its remaining budget in the popup and redirect exhausted tabs to
the extension's blocked page. Does not read historical browser history.

### scripting

Reinjects only packaged content scripts into already-open HTTP(S) tabs after
an extension reload, restoring foreground activity heartbeats, selected
in-page distraction controls and budget reminders without requiring a page reload.
No remote script is loaded or executed.

### alarms

Reconciles time budgets, scheduled focus sessions and applicable restrictions
when the service worker wakes. Supplements foreground activity events and does
not perform network polling.

### idle

Detects idle/locked computer state so unattended foreground browsing is not
charged as active use. Does not read input text, record keys or capture screens.

### webNavigation

Detects full navigations and single-page application route changes so website
rules and timers apply to the current URL. Checks top-frame document identity
to reject stale content-script messages.

### Host permissions: http://*/* and https://*/*

Users can budget arbitrary websites and view local browsing-time reports.
Bundled content scripts need access across ordinary HTTP(S) pages to report
visibility/activity, apply selected distraction-hiding CSS and display optional
animated quota reminders. Background URL matching enforces the user's rules.
This functionality must work from navigation without requiring a toolbar click
on each page, so activeTab alone does not support it. No page text, credentials,
messages or form values are saved or transmitted by these scripts.

## Privacy practices

Remote code: No. All JavaScript, CSS, artwork and sound generation are bundled.

Data categories handled by this version:

- Web history: current URLs for rule matching and transient checkpoints;
  persisted hostname duration/session aggregates and user-entered URL rules.
- User activity: foreground visibility/focus, idle state, audible-tab flags,
  time and session counts used for local time management.

Declare local handling accurately; do not select “no user data” merely because
nothing is uploaded. No name/email/payment/health/authentication data, precise
location, personal communications or page text is collected. CSS hiding inspects
page structure/selectors but does not retain website content. Reminder group
names are rendered into the website DOM and are disclosed in the privacy policy.

The following certifications match the current implementation:

- User data is not sold or transferred to third parties.
- User data is not used or transferred for purposes unrelated to the single purpose.
- User data is not used or transferred for creditworthiness or lending decisions.

## Reviewer test instructions

No account, credentials, server or subscription is required. Chrome 120+.

1. Open extension Settings. Add a group named Test with example.com as its
   website pattern and a 1-minute daily budget, then Save settings.
2. Open https://example.com and keep it in the foreground. Accounting starts
   automatically; opening the extension popup shows the live remaining budget.
3. With otter reminders enabled, a reminder appears around 30 seconds and 48
   seconds used. Their lifetimes are 3 and 6 seconds. At exhaustion the tab is
   redirected to a blocked page with a continuing, dismissible otter.
4. A softer way to inspect the mascot is Settings → Preview otter (10 seconds).
   A click starts the short synthesized sound; autoplay can otherwise be blocked.
5. Inspect local usage reports in Settings. Clear statistics does not reset the
   budget. Changing language or reminder preferences does not need a challenge.
6. A fixed focus session cannot be canceled from the extension while active.
   Relaxing restrictions may require confirmations/a typing challenge; exhausted
   budgets cannot be loosened during active hours. These are intentional features.
7. For a fresh test, use a new test profile or reinstall; do not use a personal
   browsing profile if its saved rules matter. Uninstallation is a bypass, not
   prevented by this self-control tool.

## Owner upload steps

1. Open https://chrome.google.com/webstore/devconsole and sign in.
2. Create a new item and upload `open-stay-focused-0.3.0.zip`.
3. Fill Store listing using the supplied description, icon and four screenshots.
4. Fill Privacy practices with the single purpose, every permission justification,
   data categories and the public privacy policy URL above.
5. Select free/public distribution and fill any required account details truthfully.
6. Add the reviewer instructions. Resolve errors shown by the dashboard.
7. Submit for Review. If chosen, automatic publishing occurs after approval.
8. Record the assigned extension ID, item URL and submission status here once known.

A submitted item is not yet a published listing. Approval is controlled by Google.
If Google requests changes, preserve the item ID and submit an updated package
with a higher version rather than creating a duplicate item.

## Official references checked 2026-10-23

- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
