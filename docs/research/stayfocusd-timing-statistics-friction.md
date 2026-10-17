# StayFocusd 4.6.17 深入研究：计时、实时显示、统计与设置障碍

研究日期：2026-10-17。对象为本机安装的 `4.6.17_0` 发布包，
不是对未知新版本的推断。延续 REA 已有完整证据，手工追踪发布代码补足
语义图的覆盖缺口；没有重新运行耗尽内存的全量分析。

## 结论

1. 原版以访问区间为账本，而不是每秒给计数器加一。
   已结束区间使用结束时间；未结束区间使用当前时间。
   弹窗和浮动计时器每秒重新查询，后台也每秒检查拦截。
2. 网站统计以 hostname 会话为单位，预算则使用含路径的 page-view 记录。
   同一域名多标签的会话去重，但路径级预算可能重复累计并发有声页面。
3. 原版默认计入后台有声标签；普通前台要求活动标签、聚焦窗口、
   非最小化及近期活动。该版本的活动回退主要检测鼠标、加载和可见性。
4. 原版会用新规则重新匹配当天历史访问，因此新建分组可能立即消耗
   额度；生效时段限制检查没有逐段裁剪历史访问。
5. 图表计算时会纳入未结束会话，汇总卡片却只算已结束会话。
   不能把“弹窗每秒刷新”等同于“所有统计都每秒更新”。
6. 防反悔覆盖输入挑战、受限编辑、额度耗尽锁定、当天日期锁定、
   次日生效、连续确认、隐藏逃生入口及强制专注锁定。
   原版多处只做界面限制，导入和底层写入的保护并不一致。

## 独立运行探针

在临时 Chromium 配置中加载未改动的原始扩展，使用不可达的本地代理
阻止外部网络；未使用个人浏览器配置、未接受首次启动隐私条款。
读取设置路由的界面，并通过 DOM 调用测试挑战按钮。输入事件与
Playwright 键盘事件验证以下行为：

- 一次插入多个字符会清空输入；逐字正确输入保留。
- 输入错误字符清空整段。
- 实际按 Backspace 将 `Th` 变为 `T`，没有清空全文。
  因此该发布版本的“退格清空”提示与实际行为不一致。

这只验证本地测试挑战；没有运行原版上传、同步或个人站点行为。
下方其他结论为明确定位到发布代码的静态推断，不宣称完整运行等价。

## 开源实现决策

用户已明确选择：所有用户升级后立即启用全部防反悔限制。
采用原版有用机制，独立实现统一后端校验，修正已经识别的缺陷。
继续保留本地存储、30 天统计、中文/英文和无遥测的产品边界。
保留现有非追溯扣时和仅生效时段扣额度语义，不为重算历史而保存完整 URL。
后台有声计时提供显式开关；同域名与同分组并发去重。

Chrome 本身可能暂停后台 worker 或延迟回调；秒级刷新不是硬实时保证。
持久化检查点与事件驱动恢复仍然必要：
[Chrome worker 生命周期](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)。
前台空闲判定沿用
[Chrome idle API](https://developer.chrome.com/docs/extensions/reference/api/idle)。

以下附录保留可复核的哈希、字节位置、边界和未验证事项。
不包含原厂源码、图形或挑战文章。

---

# StayFocusd 4.6.17 timing investigation

Scope: static read-only shipped artifact. No personal state read, no runtime execution,
no network requests. All behavior below is inferred from direct callpath inspection,
NOT an observed browser run. REA parent evidence reused from portable bundle:
`ev_98235a502b399bf612c2dec5a69ad5c6307b5260376e9eebada948785874169e`.
Root identity: `373bd721f7ac9e986c3f30f7b7d44bf913a97ffddc8f5f4867eb43d788a8ae10`.
REA graph coverage incomplete due result budget; module facts retained. Agent session
could not resolve retained ID; read exported portable record instead. Direct source
anchors and full file digests are in `timing-anchors.txt`; offsets are UTF-8 bytes.

## Accounting model

Shared chunk `uct` (byte 1162476) constructs timer-service. Every getPopupTimer /
getAllTimers / getTimerById call reads usage-service getTodaysUsage. The latter
(byte 1159202) obtains reset offset, chooses today's or yesterday's local day start
plus reset offset, then queries page views whose startedAt falls in [reset,nextReset).
Page-view repository query (962095) uses indexed startedAt and half-open range.
Timers do not persist a one-second decrement counter.

For each nonnuclear timer, while global isActive() is true, filter page views using
URL reconstructed from appId + path + query and that timer's blocklist/brand IDs.
Allowed websites are excluded by `$p` (1096515). Sum:
  used = sum((endedAt ?? now) - startedAt)
  remaining = allowedTimeMs - used
Local timers use local page views; synced timers additionally use remote sessions.
An open interval contributes its elapsed wall time on every query, so no per-second
database rewrite is needed. Every matching group independently sums its matching
page views. The popup returns ONE selected timer, not min remaining across groups.
Priority is nuclear, blocked, allowed, unrelated. Same-priority comparator favors
the default timer in a particular operand order and otherwise returns rank (positive),
so overlapping groups lack a clean strictest-first comparator. Do not replicate this.

Nuclear timer is wall clock allowedTimeMs - (now - startTime), independent of usage.
Outside active hours/day or if deactivated, nonnuclear displayed used becomes zero;
recording itself is independent of schedule (monitor enabled by accepted ToS).
Thus day's recorded intervals can be charged after hours become active; there is
no per-interval schedule clipping in timer-service. This is a semantics choice to
state explicitly, not silently impose on our existing active-hours-only budget model.

## Session boundaries and deduplication

Shared `uot`/Tc monitor (993696), `XJe` (854128), `fc` (969550):
- Watch navigation completion (top frame only), tab created/updated/activated/removed,
  window created/focus changed/removed. A serialized mutex queue prevents concurrent
  updateSessions writes. All event timestamps default Date.now; navigation uses its
  supplied timeStamp floored.
- Tab counts if (trackAudio AND tab.audible) OR (tab.active AND window.focused AND
  window not docked/minimized AND hasRecentUserActivity).
- Audio tracking default is TRUE (`GJe=!0`, 853448; idt storage setting references it).
  Background audible tabs count even if foreground idle/unfocused/minimized.
- Group all tabs by hostname; one app/session interval per hostname stays open while
  any qualifying tab exists. Different domains can overlap when audio enabled.
- Page views retain path/query and are separately opened/closed. Existing active page
  view matching hostname+path+(query when present) is retained. Multiple active URLs
  on one host may therefore yield overlapping page-view durations even though host
  session statistics are deduplicated. Timer accounting uses page views, not host
  sessions. Potential overcount for simultaneous audio URLs is static risk, untested.
- Closing/reopening intervals happens only on state transitions, not on every tick.

Inactivity is NOT implemented with chrome.idle in this version: setupIdleTriggers
is empty. Content script Fb (usage-monitoring.js byte 46321) schedules inactivity
one minute after mousemove/load/visibility-visible. Those events reset timeout;
on transition sends fallback-idle-state-changed. Keyboard/scroll are not listed.
Background po (101913) accepts the change only from an active tab and changes a
single global recent-activity boolean, then triggers a session check. The global
boolean and active-but-unfocused windows are edge cases worth avoiding ourselves.
UB (content byte 1008319) uses first qualifying mousemove to recover a missing active
session after page load; checks current URL, existing hostname session, document focus.

Heartbeat `pingLastAliveAt` (975310) writes last alive every 30 seconds; a gap over
2 * 60 seconds triggers cleanup at min(now, lastAlive + 30sec). On runtime startup,
close prior active intervals at that estimated shutdown time. `onSuspend` ends host
sessions; startup cleanup closes both sessions/page views. Five-second startup
fallback permits updates when onStartup never fires. Background also invokes
runtime.getPlatformInfo every 20 seconds (`ud`, byte 346632), apparently a worker
keepalive attempt; static code does not prove indefinite MV3 timer reliability.

## Why timer looks live

- Popup `ut`, popup-BeW3Q6BV.js byte 6872: query getPopupTimer every ONE SECOND;
  also refetch mount/reconnect/focus.
- Page overlay V7, overlay.js byte 1263433: identical one-second query; CurrentFloatingTimer
  byte 1271766 formats hours/minutes/seconds. It displays remaining allowance,
  not necessarily a standalone elapsed-session stopwatch. Floating overlay injection
  uses configured ShowFloatingTimer, replace with blocking overlay when needed.
- Background As (1785): one-second badge refresh. Only last 60 seconds show numbers;
  <=60 yellow; <=10 red; seconds ceil. Cached updates avoid identical badge API writes.
- Background so (97755): one-second enforcement loop checks selected current URL timer;
  active schedule status is refreshed every TEN seconds. Blocks when nonnuclear left
  <1 second or nuclear applies, plus relation and enabled conditions. It sends page
  overlay show/hide; default notifications at 60,10,5 seconds (dedupe not traced).
- UI query library interval implementation only refetches while focused unless
  refetchIntervalInBackground option is set; these queries don't specify that option.

Real-time = persisted start/end timestamps + now + 1s display polling. It is not a
perfect real-time clock guarantee; delayed/throttled callbacks affect refresh/block latency.

## Reset and boundary caveats

Background daily-reset cron uses configured hours/minutes, default 03:00.
`Nn` (97057) applies queued reset changes, records last reset, emits dailyReset.
Startup compares last reset boundary and catches missed resets. Usage-service `act`
(1156899) dailyReset handler closes/reopens current page view ONLY if exactly one
is active. Since getTodaysUsage queries by startedAt, multiple active page views
crossing reset may be excluded in new day. Do not copy this potential flaw.
Active hours `Rh` handles overnight windows via OR; day gate is current weekday,
not previous start day's weekday. Minute boundaries inclusive. These differ from
our start-day overnight scheduling and should be documented, not blindly cloned.

## Implementation recommendations (independent design)

1. Add one-second popup + optional floating timer rendering based on authoritative
   settled totals and a current interval baseline. Query/heartbeat also settles usage,
   but use elapsed deltas, never ++seconds. Stop interval on close and avoid overlapping RPC.
2. Preserve event-driven foreground tracking; add opt-in audible background tracking
   with deduplication by hostname and union overlapping intervals per group.
3. Keep bounded restart accounting with 30sec checkpoint/alarms and monotonic safeguards;
   exact wall clock deltas plus all reset/day/schedule boundary splits.
4. Enforce ALL exhausted matching groups; do not inherit original overlap comparator.
5. Keep our existing active-schedule semantics. Explain any change separately.
6. Test foreground switch, minimized windows, idle recovery, media, same hostname
   multiple tabs, overlap groups, reset crossing with multiple audible tabs, restart,
   clock rollback, worker suspension and late timer callbacks.

Unresolved: actual browser timer throttling/block latency; timer overlay drag/close
persistence details; negative-clock delta behavior; runtime multi-audio boundary
reproduction. Direct static evidence answers architecture, not these observations.

Additional confirmed design choice: timer-service has no group creation timestamp or
policy-version cutoff when summing today's usage. Creating a new group or adding
patterns can retroactively charge earlier matching visits from this reset day.
Changing allowlist/blocklist also reclassifies already recorded intervals at query
time. Our current immutable accrued group usage differs; retrospective accounting
needs URL history (privacy/storage cost) and explicit product semantics. For a local
implementation prefer retained canonical host/path segments without query strings;
make documented decisions about retroactivity rather than accidentally changing it.


---

# StayFocusd 4.6.17 statistics research

Read-only shipped-artifact analysis; no personal browser data or runtime observed.
REA parent: ev_98235a502b399bf612c2dec5a69ad5c6307b5260376e9eebada948785874169e.
Artifact SHA256: 373bd721f7ac9e986c3f30f7b7d44bf913a97ffddc8f5f4867eb43d788a8ae10.
Retained ID unavailable in worker session; reused complete exported bundle
`.superpowers/deep-research/rea-evidence.json` and focused original-file reads.
REA content-scripts/usage-monitoring.js semantic pass exhausted heap; manual
inert source reads below supplement the static evidence, not execution evidence.

## Findings (static code, high confidence except noted)

1. Two related ledgers, not one number per website.
   IndexedDB UsageSdkDb schema 8 has sessions_2, page_views and ads-2.
   Session fields: id, appId (hostname), createdBy (installation ID), startedAt,
   endedAt, imported, generated. Open sessions use endedAt=-1 in storage and
   null in model; indexes by startedAt and endedAt. Page views additionally
   hold path/query/referrer and attribution metadata. The original tracks these
   for more than local budgeting; our local reconstruction should NOT collect
   query strings, referrers, ad/UTM details or installation identity.

2. Session eligibility: configured audible tab OR (active tab AND focused
   window AND window neither docked nor minimized AND recent activity).
   Audible branch bypasses foreground/recent-activity requirements.
   One ongoing session per hostname if ANY tab for it qualifies; same-domain
   duplicate tabs do not cause multiple hostname sessions. Distinct audible
   websites can run concurrently, so sum of domain durations may exceed elapsed
   wall time. A new page path may change page view without starting new hostname
   session. Page views are matched on hostname/path/query when query exists.

3. Event-driven begin/end, not per-second database increments.
   Monitor listens navigation completed (main frame), tabs created/updated/
   activated/removed, windows created/focus changed/removed. A five-second
   window-state fallback additionally checks restoration. Session changes are
   serialized using an async mutex. End/start transactions complete, then
   listener callbacks fire. Active session elapsed time is now-startedAt.
   Background custom activity messages accepted only from an active sender tab.
   Content fallback listens mousemove, load and becoming visible; one minute
   without those flips recent activity false. It does NOT establish keyboard
   activity in this fallback. Separate first-mousemove recovery checks whether
   the current host lacks an active session before messaging background.
   setupIdleTriggers is empty in this build (no Chrome idle hookup there).

4. Recovery: heartbeat persists last-activity-time-ms every 30s. Startup cleanup
   closes previous active sessions/page views at min(startup time,lastAlive+30s).
   Gap >2*60s triggers cleanup on next heartbeat. Runtime suspend closes active
   sessions. Five-second startup timeout releases processing if startup event
   absent, WITHOUT forced cleanup. Repository clamps a >=6-hour completed
   session to 10 minutes as anomaly handling. Do not copy this data distortion;
   use explicitly bounded recovery with documented limits in local version.

5. Aggregation: usage service queries sessions by startedAt in [start,end),
   rounded to seconds, with custom daily reset-time adjustment. Summary groups
   by brand/display hostname and aggregates count, completed durations, ad
   count, blocked/allowed markers and platform. Highlights include total
   sessions/duration/sites, blocked sites/sessions, favorite start hour and ads.
   Search and all/blocked/allowed filters exist. Remote device/platform joins
   exist but excluded from reconstruction.
   Chart duration sums intersection of session interval and hourly/day bucket;
   session count counts starts within bucket. Charts substitute Date.now() for
   unfinished sessions. Summary/highlights instead use 0 duration for unfinished
   sessions. This is a material distinction: do not claim all stats are live.
   Multi-day chart bucket is day; day chart default bucket is hour. Source has
   reset-boundary/date arithmetic worth testing; do not blindly copy fixed 24h
   day assumptions for DST. Query-by-start excludes prior-start overlap unless
   another mechanism split it. DailyReset explicitly splits sole active page
   view; no equivalent general hostname session splitter found in scope.

6. Realtime display: popup timer query explicitly refetches every SECOND.ms;
   background badge also checks each second. Chart elapsed calculation uses
   current time when query runs; chart/summary/highlights query hooks inspected
   have NO explicit refetchInterval. Do not infer continuous stats-dashboard
   updates from one-second popup countdown. Default query-cache behavior and
   full UI invalidation behavior not exhaustively traced.

7. Budget distinction: getTodaysUsage reads page_views by startedAt in daily
   reset range (plus optional remote sessions). Statistics read sessions_2.
   Detailed timer policy/budget derivation delegated to timer researcher.

8. Backup/retention: database exposes exportBackup of all stores and version,
   removes imported flag on export; import migrates versions, upserts and marks
   imported. This is an SDK capability, not proof of user-facing CSV/export UI.
   No local usage retention expiry found in the inspected usage repositories/
   uploader/monitor code. Daily cache cleanup concerns cache keys, not evidence
   of session deletion. Do not claim indefinite retention proven exhaustively.
   Original background uploads usage conditionally every five minutes; monitoring
   permission and upload permission are separate callbacks. Our fork remains
   local-only and excludes uploads/account/device sync/AI/ad tracking.

## Reconstruction requirements

- Separate immutable-ish usage history from policy budget state; clearing
  visible history must not replenish consumed allowance.
- Model active hostname sessions and close on focus/tab/idle transitions;
  derive live figures from confirmed accumulated duration + current active span.
- One-second read/display refresh; persist checkpoints less often and on events;
  clamp long/unexplained gaps without silently adding sleeping browser time.
- Optional audible background tracking, default conservative and explicit;
  avoid same-host double counting and explain cross-host concurrent sums.
- Domain totals, session counts, last 7/30 day history and hourly/day chart;
  use interval overlap and local calendar boundaries, not start-only queries.
- Local export CSV/JSON and history clear through guard policy; no URL queries,
  titles, referrers, identifiers, ad telemetry or remote calls.
- Tests: duplicate tabs, two audible hosts, active+audio same host, window blur/
  minimize, idle/resume, URL path change, midnight/reset/DST, crash recovery,
  sleep gap, unfinished live session, concurrent event serialization and clear
  stats not restoring budget.

## Source identity and reproducible locations

Offsets below are UTF-8 bytes (0-based) from original artifact. Ranges in earlier
terminal exploration were Python Unicode indices; these are converted correctly.

### chunks/_virtual_wxt-plugins-CbggpU_J.js
SHA256 `718b781f418d4924e8a19e9909530b7d823bab729b58ce91847ab45a76fdd9e4`
- bytes 854059..854550: JJe/XJe eligibility; constants and mutex
- bytes 959800..969550: repositories/schema/export/import
- bytes 969550..976000: fc session monitor/recovery
- bytes 993700..999800: Tc monitor event triggers and session diffs
- bytes 1112594..1116046: chart count/duration buckets
- bytes 1150306..1161906: query hooks, repository adapter, usage service

### content-scripts/usage-monitoring.js
SHA256 `9dec1ef7c3ca40d62300f70e485525f4d7d37ff80acd319e197ab18c56fc84f8`
- bytes 46300..46900: Fb idle fallback
- bytes 1008357..1009104: UB missing-active-session recovery

### background.js
SHA256 `64634ab7254fe30010dc17385acce5e258704d8d02b3674ec9dd449dcc02c017`
- bytes 1800..2100: As badge loop
- bytes 101900..103100: po usage SDK wiring

### chunks/index-DsiyHRPi.js
SHA256 `8d0b380281b9c9e0b20cb899ba0bd97c742e46acaed7dde013e334eb1d0c2b91`
- bytes 6650..6900: Be chart query
- bytes 82500..83200: highlight query

### chunks/popup-BeW3Q6BV.js
SHA256 `fa9351d346b99249cad0c76079a1de738e3bb7cd9b70ef7e7e23602845c6aca7`
- bytes 6800..7250: popup timer one-second query


---

# StayFocusd 4.6.17 settings friction analysis

Static shipped-artifact analysis. No target runtime observation performed by this worker.
REA parent: ev_98235a502b399bf612c2dec5a69ad5c6307b5260376e9eebada948785874169e.
Portable existing bundle: .superpowers/deep-research/rea-evidence.json; graph partial semantic coverage. Retained ID unavailable in this worker MCP session. Findings independently traced against shipped file bytes; no producer rerun.

## Source anchors (UTF-8 byte offsets, zero based)

chunks/default-DmNWHRrL.js
SHA256 de41ce235a5a7b3e57985a9c9157fb872afd4316b97e849897f575f5d8a4f021
- __name:"RequireChallengeDialog": 19138

chunks/challenge-text-BoiaY8h6.js
SHA256 544ff3b4378b7774c2cb52d40c3132d375bc69159a0627377b05500f6b5feaca
- const i=250: 0
- function p: 306
- function a: 423

chunks/useChallengeStore-DhXslUg3.js
SHA256 40add480ee40a0308eb06c153d7e4269159dabb25f519080fb1c0e6ef3c0ac02
- const R=: 137

chunks/require-challenge-DmHtLaQF.js
SHA256 a525f68a80007e002a843e9ab778ec144430b4b0c7cd34c74fb85557db5a5cfb
- function $: 981
- function N: 1308

chunks/blocked-sites-CakJr4mX.js
SHA256 04ee78ccb54d5de4fd45901eb3728d2dd6d66f976389348ae657c7783e3ad60e
- function ge: 2138
- __name:": 13937
- name:"EditGroup": 4506
- function Te: 10718
- name:"BlockAllWebsites": 11636

chunks/active-time-D5qlAukP.js
SHA256 ca3acd1c04cb400563ce118d06c59785297ca68443832c22907dc5216f4d90d2
- __name:"DailyResetTime": 880
- __name:"ActiveHours": 2011
- __name:"ActiveDays": 4247

chunks/whitelist-Bywu2un6.js
SHA256 4746b5739f86bf7dc97f3b5bd5b75bb84241d469ccd1834c37a43f4f2ff2abd0
- __name:"WhitelistInput": 1414

chunks/useAddAllowedPatternMutation-C7of9fo1.js
SHA256 34cd80a7cb17f0327e83e585083e2196afaa15ed63aaae0fbfa2f07e5e5c6968
- function D: 252
- function v: 612

chunks/nuclear-_v_sN_qL.js
SHA256 4947f35ce05d1723608ae3fa2e9a19ee978d7691ed708ebdf7b4101bbefe6886
- __name:"NuclearQueue": 951
- __name:"NuclearOption": 3618

chunks/settings-qqO8YvQZ.js
SHA256 ee273f370d0038c30e07e5e557f6031ad62c6c3896420390214e5d03e52c7296
- async function Rt: 1715
- __name:"ImportSettings": 2697
- z=U(: 8078

chunks/ActiveToggle.vue_vue_type_script_setup_true_lang-9RR7O3sy.js
SHA256 46d38cd40a72052fc223d1b8f49cfe17c20c9d0bda547b735f894d7510af8849
- function te: 3267
- __name:"ActiveToggle": 3682

chunks/_virtual_wxt-plugins-CbggpU_J.js
SHA256 718b781f418d4924e8a19e9909530b7d823bab729b58ce91847ab45a76fdd9e4
- upsertTimer:: 1164170
- deleteTimer:: 1164252
- function tKe: 811082
- IO=": 224163
- BO=": 224337

## Complete inventory within inspected local settings flows

1. Challenge gate is an options-page session gate, not a per-command authorization token.
- useChallengeStore stores completed and limited-mode booleans in memory.
- Normal entry when challenge enabled opens challenge; completion marks completed for that options-page instance.
- Limited access permits more restrictive actions; navigating to require-challenge, settings or in-app-blocking forces challenge again, redirecting to dashboard on entering limited mode from those routes.
- Giving up closes the current extension tab when challenge enabled; testing mode closes test dialog.
- Global generic dialog Escape wiring exists, but challenge visible is controlled by the gate; do not claim Escape bypass without runtime probe.

2. Typing mechanics (actual code differs from prose).
- Every input increments an input-event counter, NOT keydown count.
- If text.length - inputEventCount > 1, clear and alert suspected bulk insertion.
- Prefix must exactly match source (case/punctuation/whitespace). Mismatch clears text and counter.
- keydown stores keyCode. keyCode 229 means compare all but last character, a limited IME accommodation.
- Full exact equality sets completed and clears draft.
- No dedicated paste/drop listener in this dialog; paste is indirectly caught by length-vs-input counter.
- No pause timeout, blur reset, backspace or delete-key reset is implemented in this component.
- Deleting an end character leaves a valid prefix and is allowed by the inspected code, despite description promising reset on backspace/delete.
- Counter can accumulate through editing; do not reconstruct this weak counter as a security guarantee.

3. Custom challenge.
- Minimum 250 JS UTF-16 code units and minimum 5 distinct charAt characters.
- Newline/CR/tab -> spaces, repeated spaces collapsed, curly quotes/ellipsis/dashes and selected typographic characters normalized, URI encoded for storage.
- Validation happens before normalization, permitting padded input that shrinks below minimum after normalization.
- Reset-to-default changes draft text and alerts; it does not persist immediately in its handler. Toggle/test path persists current draft via p(), unlike validated Set Custom Text handler.
- Default phrase is localized; use independent original wording in replica.

4. Limited settings mode details.
- Existing group name/allowance/delete/remove controls disabled.
- Add groups and add blocked sites remain available (stricter actions).
- Active days: already checked days disabled; unchecked days may be enabled.
- Active-hours/reset-time sections hidden entirely.
- General settings, challenge settings and distraction settings gated again.
- Whitelist component does not consult limited-mode store; add-whitelist mutation has exhausted-group check only. This is a possible policy gap; don't reproduce.

5. Daily-budget increase friction.
- ge(oldAllowedMs,elapsedMs,newAllowedMs,blockAllFlag) validates < 24h; rejects negative; block-all rejects zero; individual group zero allowed.
- Reducing allowance to <= elapsed asks immediate-block confirmation.
- Increasing normally triggers 2 sequential confirmations and an alert.
- Intense increase path has 8 sequential confirmations, then an alert and opens a procrastination-themed URL.
- IMPORTANT: condition uses oldAllowedMs-elapsedMs < 180 literal, while call-site values are milliseconds. Thus shipped static code selects intense path under 180ms, NOT the advertised 3 minutes. Furthermore normal UI locks at <=1000ms, likely rendering this branch inaccessible via ordinary exhausted-group UI. Treat as defect, not intended behavior.
- Successful change alerts; reduction adds praise message. No next-day deferral for daily allowance in this function.

6. Exhausted group restrictions.
- EditGroup considers remaining <=1000ms exhausted.
- Name disabled if exhausted or limited; default group's name always disabled.
- Time controls/save allowed only if not exhausted OR exactly zero budget, and not limited.
- Delete allowed only non-default, not exhausted, budget >=1000ms, and not limited; delete asks destructive confirmation.
- Remove blocked site allowed only no active nuclear AND (not exhausted OR zero budget) AND not limited.
- Adding blocked sites remains possible.
- Synced group activation toggle appears when synced and not limited; no exhausted check on this toggle (potential gap, not evidence of successful remote disable).
- Group mutations directly write timer through timer API; frontend checks are not repeated in these mutation handlers.
- Block-all view's remainingTime clamps below1000ms to1; isTimeExpired compares remainingTime==0. Static defect means its expired UI guard can never become true under this computation. Toggle disable guard only limited mode.

7. Active days/hours/reset.
- Selected current weekday cannot be unchecked. Other weekdays change directly; adding today allowed.
- Active hours and daily reset changes are queued until addDays(Date.now(),1), i.e. same local clock time next date (DST can be 23/25 actual hours), not midnight or next daily reset.
- UI all hour/reset changes delayed, not only loosening. Shows pending apply date and values.
- Queue overwrite on a new edit restarts delay from that edit.
- Background application/queue persistence belongs to timer worker's scope; coordinate their confirmation.

8. Allowed sites.
- Add blocked during active nuclear; individual remove icons also hidden then, but Clear All button remains, with destructive confirmation (stricter action).
- Addition checks current exhausted group domains: extracts hostname, exact websiteUrls includes(host) or brandIds match; remaining<1000ms. Failure returns cannot-add message.
- This is hostname/exact membership check, not full general pattern overlap proof. UI multi-add caller discards returned status; popup may handle it separately.
- Ordinary whitelist removals do not need confirmation, clear-all does.

9. Nuclear.
- Scope blocked sites / all except allowed / all; whole-site or Smart Bomb elements (multimedia, forms, logins, images).
- Start now / maximum allowance exceeded / specific time; delayed frequencies today / active days / weekdays / every day.
- Start builds detailed scope/duration/timing confirmation, alerts commencement.
- Active timer disables nuclear editor; no cancel-active UI.
- Pending queue can be deleted only when not active.
- Active nuclear blocks removing blocked sites, whitelist additions and import UI; not all general settings are universally locked.
- These are intended local feature modes; no guarantee against browser removal or modifying extension storage.

10. Activation friction and hiding escape controls.
- ActiveToggle disable asks 10 consecutive confirm dialogs: initial + disableExtension1..8 + final warning, then disabled alert.
- Cancel any leaves enabled. Enabling immediate.
- Toggle controlled by IsActivateSwitchShown preference.
- Settings cannot reveal a hidden activation switch while any group has timeLeftMs<1000ms or nuclear exists. Already-visible toggle not disabled by this condition.
- Separate HideAllowSiteLink option hides popup allow-entire-site/custom-url actions.
- Neither option constitutes browser-admin uninstall prevention.

11. Import/export.
- Export emits selected LOCAL/SYNC settings, including challenge, active days/hours/reset queues, activation/hide options; timers, whitelist, groups via synced set.
- Import parses JSON (URI decode fallback), restores allowlisted keys and runs migrations.
- Import disabled in UI while nuclear active and challenge page gate applies; import routine itself does not recheck nuclear, exhausted budgets, pending cooldown or challenge proof.
- Hence importing can potentially bypass regular UI constraints; must consolidate validation in replica backend, including import.
- No new password/PIN, waiting spinner, timeboxed typing pause, OS lock or uninstall prevention established in inspected feature scope.

## Recommendations for independent implementation

- Implement policy changes centrally in controller; classify tightening versus loosening.
- Protect exhausted groups against budget increase/removal/disabling/allowlist overlap and imports; retain stricter edits.
- Apply 24h delay to active-hour/reset changes (document DST choice). Persist queues across restart, and preserve usage.
- Optional strict typing: wrong input/delete/paste/drop reset, IME-aware input; custom >=250 Unicode characters after normalization with >=5 distinct characters. Treat this as friction, not tamperproof security.
- Optional limited editing session: permit only tightening commands; don't trust disabled DOM.
- Confirm budget increases and deactivation with escalating original bilingual text; use correct 180000ms threshold, never copy the literal unit defect or open unrelated external URL.
- Hide quick allow/deactivate affordances, and prevent revealing them under exhausted/nuclear commitments.
- Preserve active nuclear snapshot, guard all mutation routes/imports. Add scheduled/threshold and recurrence modes only if included in parent implementation plan.
- Test direct messages/import, boundary1000ms, zero-budget semantics, midnight/reset, restart, language/IME, dialog cancel, stale revisions and clocks.

## Evidence boundaries

All observations above derive from shipped package code and resource text; controlled runtime needed to adjudicate Vue event ordering, IME behavior, inaccessible branches, and remote-synced group effects. Browser-level disabling/uninstallation remains outside extension enforcement. Do not copy original proprietary code, text, assets or telemetry into public repository.
