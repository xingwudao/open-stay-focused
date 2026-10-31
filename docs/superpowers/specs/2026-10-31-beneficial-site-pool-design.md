# Beneficial Site Pool and Redirect Policy Design

## Intent

Open Stay Focused currently creates distance from addictive websites. This feature adds a complementary positive path: when a distracting-site budget is partly or fully consumed, the extension can recommend a user-chosen website that is worth visiting more often.

The pool is not another block list. Its per-site minutes are daily minimum goals, not maximum allowances. Pool edits are encouragement settings and never require typing challenges or confirmation steps.

## Goals

- Let users maintain a pool of beneficial destination websites.
- Give each destination a daily foreground-reading target.
- Reset positive targets on the same fixed local boundary as distracting-site budgets.
- Add a small redirect Policy module with `random` and `largestDeficit` strategies.
- Automatically replace the quota block page with a selected beneficial destination when a normal website budget is exhausted.
- Include the selected destination in the otter reminders at 50% and 80% usage.
- Keep all configuration and positive usage data on the device.
- Preserve every existing restrictive setting, challenge, focus-session, and statistics behavior.

## Non-goals

- No cloud sync, accounts, recommendation service, or built-in editorial list.
- No analysis or reading of destination page contents.
- No third-party Policy plug-in API in the first version.
- No positive-goal streaks, notifications, rewards, or cross-device totals.
- No redirect away from a nuclear focus session.
- No migration that changes existing distracting-site budgets.

## User Model

The settings page gains a “Better destinations” section. A pool item contains:

- Stable random ID.
- User-visible name.
- Concrete `http://` or `https://` destination URL.
- Enabled flag.
- Daily target in whole minutes, from 1 through 1,440.

The serialized settings field is `beneficialPool: {policy, items}`. Each item uses `{id, name, url, enabled, targetMs}`; `targetMs` is always a whole number of minutes expressed in milliseconds. Positive progress is stored separately as `beneficialUsage` on the root state.

The section also contains a Policy selector:

- `largestDeficit` is the default.
- `random` selects uniformly from eligible destinations.

Pool changes are saved with the normal settings save action. A change that only touches the pool or Policy has zero confirmations and no typing challenge, including while a nuclear session is active. If the same save also relaxes a restrictive setting, the existing challenge and confirmation rules still apply to that restrictive part.

The pool starts empty for new and upgraded installations. Empty pools preserve the current block-page experience.

## Positive Usage Accounting

Positive usage is stored in a dedicated top-level `beneficialUsage` ledger:

```text
beneficialUsage[budgetDay][poolItemId] = foregroundMilliseconds
```

The ledger uses `budgetDay(now, settings.resetMinute)`, so its daily boundary is identical to distracting-site budgets. It is retained for the same 30-day window as other local history, but only the current budget day is needed for Policy decisions.

Time counts only while the destination is the foreground tab in the focused browser window and Chrome reports the user active. Background audio never contributes, even when “track background audio” is enabled for ordinary statistics. A toolbar popup may preserve the owning page’s foreground eligibility in the same way it does for existing quota accounting.

The background sampler therefore produces a separate foreground-only visit set for positive accounting. It must not reuse ordinary eligible visits unchanged, because those visits may contain audible background tabs.

By default an item covers the hostname in its destination URL and its subdomains. Paths and query strings choose the landing page but do not narrow accounting. Two pool items with the same hostname can both accrue the same interval; their independent IDs and targets remain valid, although the settings UI should explain that they share observed browsing time.

Changing an item’s name, URL, target, enabled flag, or Policy does not erase its current-day ledger. Deleting an item makes its orphaned values inert until retention pruning. IDs are never reused.

Clearing ordinary statistics does not clear `beneficialUsage`, for the same reason it does not restore restrictive budgets: a reporting action must not rewrite today’s Policy progress.

## Policy Contract

A new focused module owns selection and destination matching. It exposes a pure selector that accepts validated pool settings, the current positive ledger, current budget day, current URL, an eligibility predicate, and an injectable random function.

Before either strategy runs, candidates are filtered to items that are:

- Enabled.
- Validated `http://` or `https://` destinations.
- Different from the current page after URL normalization.
- Not currently blocked by ordinary rules.
- Not blocked by an active nuclear session.

`random` selects uniformly from the filtered candidates.

`largestDeficit` computes `max(0, targetMs - usedMs)` for each candidate and selects the largest value. Ties are resolved uniformly at random. When every target is already met, every deficit is zero, so the tie rule still chooses a destination and the automatic replacement remains useful.

The selector returns the item ID, name, normalized URL, target, used time, and remaining target time. It returns `null` when no candidate is safe.

## Redirect Behavior

Only `reason: quota` triggers automatic beneficial redirection. When a distracting-site allowance reaches zero, the background worker asks the selected Policy for a safe target and updates the same tab to that URL.

The current block page remains the fallback when:

- The pool is empty.
- Every pool item is disabled or invalid.
- Every candidate equals the current page or is blocked by current rules.
- Policy selection fails.

Nuclear focus sessions always keep the current block page. Allowlist, paused restrictions, unsupported URLs, and outside-schedule states never trigger a redirect.

Selection is performed immediately before navigation against the latest settled state. Navigating to the target removes the original blocked URL from the tab, so the existing navigation listeners naturally stop retrying it. Runtime filtering and the current-page check prevent redirect loops.

## Otter Reminder Behavior

At the 50% and 80% restrictive-budget milestones, the background worker runs the same selected Policy using the latest positive ledger and current page. When a target exists, the companion payload includes its name and normalized URL.

The reminder card adds one localized link:

- English: “Visit {name} instead”
- Chinese: “去看看{name}”

The link navigates the current tab. It does not open a new tab, send analytics, or dismiss the reminder before the browser begins navigation. The existing close, animation, sound, duration, deduplication, and reduced-motion behavior remains unchanged.

At 100%, automatic navigation is the primary behavior. If no safe candidate exists and the block page is shown, the permanent blocked-page otter remains unchanged and does not show a dead link.

## Validation and Migration

Settings advance to the next schema version and add a validated beneficial-pool object. Older settings migrate by adding an empty pool and `largestDeficit` without changing any existing field.

Validation rejects:

- Unknown Policy names.
- Duplicate or malformed IDs.
- Empty names or names longer than 80 characters.
- Non-HTTP(S) URLs, credentials in URLs, or URLs longer than 2,048 characters.
- Targets outside 1–1,440 whole minutes.
- More than 100 pool items.
- Settings larger than the existing 256 KiB boundary.

URLs are normalized through the platform URL parser. Fragments are removed because they do not identify a different server resource; query strings are retained for landing-page navigation. User-entered destination URLs are settings and therefore intentionally stored locally. Observed browsing paths, query strings, and contents are never written to the positive ledger.

The restrictive comparison key excludes the complete beneficial-pool object. This makes pool-only changes frictionless. The validated full settings object is still revision-checked, serialized, exported, imported, and restored through existing mechanisms.

## UI and Accessibility

The new section follows existing cards and bilingual rendering. It provides visible labels for Policy, destination name, URL, daily target minutes, enabled state, add, and remove controls. It explains that targets are minimums and that same-host items share observed time.

The nuclear-session banner is updated so it no longer claims that every setting is locked: restrictive settings stay locked, while beneficial-pool edits remain available.

The companion recommendation is a real keyboard-focusable link with a visible focus outline. Its accessible name includes the destination name. Long names wrap within the existing card instead of expanding the overlay beyond the viewport.

## Privacy and Security

- All pool configuration and ledgers remain in `chrome.storage.local`.
- No new permission or host permission is required.
- URLs are validated at the settings trust boundary and again normalized before navigation.
- Credentials and non-HTTP(S) schemes are rejected.
- Policy output is data, never HTML.
- Runtime filtering prevents a beneficial destination from bypassing a nuclear session or redirecting into another exhausted restriction.
- Existing content-script senders cannot read settings, ledger data, or Policy results except the single recommendation already intended for their visible reminder.

## Approaches Considered

### Selected: Independent positive ledger

This gives each candidate a stable goal, uses the correct reset boundary, and supports future selection strategies without coupling positive behavior to reporting data.

### Rejected: Reuse hostname statistics

Existing statistics use calendar dates rather than the configurable reset boundary and can include background audio. They also cannot reliably distinguish multiple candidates on one hostname.

### Rejected: General Policy plug-in system

A registry, external API, and configuration schema would add complexity without serving the two requested built-in strategies. The first version keeps one pure selector with a small closed set of validated names.

## Acceptance Criteria

- A pool-only edit saves with no challenge or confirmation under ordinary, exhausted, and nuclear states.
- Foreground active time accrues to matching enabled pool items under the shared reset boundary; idle, unfocused, and background-audio time does not.
- `random` and `largestDeficit` are deterministic under an injected random value and never return an unsafe candidate.
- A normal quota exhaustion navigates the same tab to the selected target.
- An empty or unsafe pool displays the existing block page.
- Nuclear sessions never redirect to pool items.
- The 50% and 80% otter reminders show the selected localized link and preserve existing reminder behavior.
- Existing installations migrate with an empty pool and unchanged restrictive settings, usage, statistics, and nuclear deadline.
- Export and import round-trip the pool; invalid URLs and Policy names are rejected.
- The privacy policy documents locally stored destination URLs, ID-keyed positive usage, retention, and reminder-link disclosure without implying that page contents are read.
- Unit, controller, companion, migration, browser, and package tests pass.
