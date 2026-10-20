# StayFocusd statistics visualization

Investigation: 2026-10-21. Reference: StayFocusd 4.6.17, Chrome extension
`laankejkbhbdhmipfmgcngdelahlfoji`. Independently authored implementation;
no vendor code or assets are included.

## Evidence and limits

The previously installed extension directory is no longer present. The saved REA
bundle was reused through REA CLI 6.4.0 `inspect-analysis-view`:

- Parent: `ev_98235a502b399bf612c2dec5a69ad5c6307b5260376e9eebada948785874169e`.
- Module inventory: `ev_b924d383575f018b0b85178f9b93c611b0d77d75a0723ba2ac837c5103b3a65c`.
- Chart module view: `ev_ee6e24a0d7f49d8b64224e555498b18064d91672167e4ba535942f4eb4d0f2c4`.
- Original artifact digest:
  `373bd721f7ac9e986c3f30f7b7d44bf913a97ffddc8f5f4867eb43d788a8ae10`.

Downloaded the official Chrome update-service package for this extension ID to
`/tmp/stayfocusd-current.crx`. Manifest version is also 4.6.17. The extracted
`chunks/BasePieChart.vue_vue_type_script_setup_true_lang-CdoDc3Ux.js` SHA-256
`90884710146c13f8735845a4c3c86ddaebdebd63c1bb05923bc60dfa46b2e7a7`
matches the retained REA module identity. No original code was executed this turn.

Focused inert reads of `chunks/index-DsiyHRPi.js` (SHA-256
`8d0b380281b9c9e0b20cb899ba0bd97c742e46acaed7dde013e334eb1d0c2b91`)
supplement REA. Original overview text and screenshot from the previous
isolated-browser probe corroborate the dashboard labels but show empty data;
they do not establish populated-chart behavior. REA's parent graph has partial
coverage and resource limits. UI rendering details below are static observations,
not a claim of runtime parity or exhaustive analysis.

## Findings

- `DashboardHighlights`: collapsible past-month highlights for total websites,
  sessions, duration, favorite hour, blocked-site/session counts and ads.
- `UsageSummaryChart`: website distribution, daily and hourly chart selectors;
  defaults to daily. Distribution uses per-site primary metric values and labels.
  Time charts also offer app/device grouping.
- `LineChart`: time-axis data with duration or integer metrics, formatted y-axis
  and per-point tooltip labels. Daily view can expand a short selected interval
  to four days. The fork deliberately keeps the user's selected interval exact.
- Primary metric supports duration, sessions and ads. Website type and search
  feed chart queries. Existing previous research covers calendar/reset semantics.
- Website summary rows expose primary value, integer percentage, a proportional
  bar, secondary/tertiary values and platform breakdown. Group rows can also show
  allowance and remaining budget.
- `BasePieChart` actually instantiates a doughnut chart, with a bottom legend
  supplied by the dashboard. `BaseLineChart` uses filled lines, point hover
  enlargement, nearest-x interaction and formatted labels.
- Bundled chart implementation includes Chart.js 4.5.1. Reuse of that dependency
  is unnecessary for the fork's limited local plots.

## Reconstruction choices and acceptance

Existing local summaries remain the single source of displayed data. No schema,
retention, privacy permissions, accounting, budgets or enforcement changes.

- Selected-range highlights: duration, sessions, distinct websites, busiest hour
  by recorded duration. All follow the same filter/search as charts and ranking.
  Tied busiest hours pick the earliest; missing hourly detail displays a dash.
- Daily line trend; hourly duration profile combines each clock hour across
  selected local dates. Labeled axes, focusable points, native hover titles,
  accessible names and expandable numeric values.
- Website-share ring: five leading websites and a labeled remaining group;
  full ranking and numeric detail retain every website. No external favicons.
- Duration/session selector also controls ranking and distribution. Session
  trends use daily counts; hourly sessions are disabled because historical data
  has no hourly session counts. No synthetic or inferred history is introduced.
- Zero charts show an explicit empty state rather than fabricated minimum bars.
  Legacy totals without hourly detail remain intact, with an explanatory note.
- Chinese and English labels, narrow-screen wrapping, live state refresh using
  the existing one-second polling. Unchanged chart data avoids DOM churn.
- Account/device sync, ad analytics and vendor appearance remain outside the
  previously approved local-only scope. Preset ranges remain today/7/30 days.

Checks: unit aggregation with legacy missing hourly data and filtered-empty data;
browser assertions for totals, hourly points, distribution percentages, ranking
switch, daily sessions, filtering, localization and 375px overflow. Screenshots
are generated from synthetic fixtures, never personal browsing history.
