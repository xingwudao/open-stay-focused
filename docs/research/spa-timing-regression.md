# SPA timing regression (2026-10-22)

## Symptom and reproduction

Reported: browsing X across multiple tabs left the daily budget at ten minutes
until opening the toolbar popup. Reproduced the underlying failure on an isolated
local SPA fixture, without accessing or posting to the user's X account.

Previous tests repeatedly sent `getState` from the options page, which itself
calls `sample()`. The new tests close all extension UI after setup and inspect
persisted usage through `chrome.storage.local.get`, without controller messages.
The test browser reports idle state as active; OS-idle behavior remains covered
by separate regression tests. Storage inspection can keep the test worker alive;
these cases establish navigation behavior, not independent suspension recovery.

Before the fix:

- Two freshly loaded tabs accumulated 6,054 ms without opening a popup.
- After `history.pushState`, usage froze at 73 ms across an eight-second wait.
- A diagnostic repeat froze at 123 ms. Real browser message metadata showed:
  sender URL `/two`, current tab URL `/blocked`, identical sender and current-frame
  document IDs. The original exact URL comparison rejected legitimate heartbeats.

## Root cause and fix

`background.js` treated `sender.url !== tab.url` as proof of a stale document.
Same-document SPA navigation changes the tab URL while the content script sender
can retain the original document URL. Rejected heartbeats leave no fresh beat for
that URL, so foreground visits become ineligible. Reinjection cannot repair this:
the existing content script is alive and its duplicate guard correctly skips it.
The verified native-popup focus path can temporarily make the visit eligible,
explaining why opening the popup appears to start the countdown.

Validate `sender.documentId` against `chrome.webNavigation.getFrame` for the
current top-level document instead. Continue reading the current URL from the tab
for policy/accounting, and retain extension ID, HTTP(S) and top-frame checks.
A missing or mismatched document ID is rejected; no fallback to trusting message
fields or host-only matching. Existing Chrome minimum version is 120.

Reference: [Chrome webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)
documents distinct document identities and `getFrame` metadata (Chrome 106+).
The fix relies on Chrome-supplied identity rather than a page-provided value.

After the fix, the same no-UI tests persisted 7,058 ms for fresh tabs and 7,072 ms
for SPA navigation. Additional regression coverage accepts `replaceState` plus
fragment changes and rejects a different current-document identity.

The installed extension source matched repository timing files, and the Chrome
profile metadata indicated HTTP(S) host access was granted, not click-only.
This is supporting configuration evidence, not a reconstruction of the user's
past browsing. Already missed time cannot be recovered from absent records;
no historical usage, budgets or settings are rewritten by this fix.
