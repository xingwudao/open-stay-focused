# Usage guide and upgrade notes

Since 0.2.3, countdown display is confined to the toolbar popup. The former page
floating timer is removed, including for existing installations. Background usage
tracking continues when the popup closes. The 0.2 notes below describe its history.

[English overview](../README.md) · [中文概览](../README.zh-CN.md)

## What changes in 0.2

Existing installations immediately receive the commitment protections below.
Your rules, consumed budgets and usage history are preserved. Typing challenges
are enabled on upgrade; turning them off requires completing the current challenge.

- One-second popup and optional movable page countdown, plus the website's daily usage.
- Optional background-audio tracking; same-host and shared-group concurrent visits
  count once. Different audible hosts may add up to more than wall-clock time.
- Today, 7-day and 30-day summaries, session counts, hourly/daily charts, filters,
  hostname search and local CSV export. Older totals remain, but historical hourly
  detail and session counts cannot be reconstructed from older aggregate data.
- Purely stricter edits work without typing; relaxing or mixed edits require the
  saved challenge. Wrong input, deletion, paste and drop restart typing; Chinese
  composition is supported. Custom text requires 250 characters and 5 distinct
  characters after normalization; previews use the same validation.
- A positive-budget group with at most one second remaining cannot be relaxed
  during active hours. Group removal, disabling, renaming, raising allowance,
  removing patterns and new allowlist entries are guarded centrally, including imports.
- Today's active weekday cannot be removed. Active-hour and reset-time edits apply
  at the same local time tomorrow (23/24/25 elapsed hours around DST). The current
  and pending values are shown; new queued edits restart the delay. Saving unchanged
  effective values does not cancel a pending change.
- Budget increases require 2 confirmations, or 8 with at most 3 minutes left.
  Group deletion and immediately blocking reductions require confirmation.
  Pausing requires 10 confirmations. Pause/quick-allow controls are hidden by default;
  a hidden pause control cannot be revealed while budgets are exhausted or nuclear
  focus is active. Zero-minute groups remain editable through challenge/escalation.

See the [deep research report](research/stayfocusd-timing-statistics-friction.md)
for source evidence, actual runtime probes, original defects and deliberate differences.

## What it does

- Shared daily budgets for website groups, including immediate blocking at zero.
- Domain and page-path patterns, with an allowlist for pages you still need.
- Active weekdays, multiple time windows, overnight schedules and a local reset time.
- Immediate or scheduled nuclear sessions: grouped sites, all except allowed,
  or all HTTP(S) websites. An active session cannot be canceled in the UI.
- An optional typing challenge before settings changes.
- Local foreground-usage totals by hostname, retained for 30 local dates.
- YouTube Shorts, recommendations and comments controls; selected Instagram
  and Facebook Reels links, X trends and TikTok recommendations controls.
- Settings-only JSON import/export. Imports respect all mutation guards and queues.
  Pending queues stay on this installation and are not included in settings exports.

## Rules you can understand

`example.com` matches the domain and its subdomains, never `notexample.com`.
`example.com/work` matches that exact path. `example.com/work/*` matches paths
under that prefix. Hosts are case-insensitive; paths are case-sensitive.
An optional `http://` or `https://` prefix does not restrict the scheme.
Patterns cannot contain ports, credentials, queries or fragments. Query strings
and fragments do not affect matching. A domain pattern applies at any port.

Each matching group consumes its own shared budget. Any exhausted group blocks.
Allowlisted pages consume no group budget. Regular budgets apply only during
active hours; local usage statistics also include time outside those hours.
Overnight windows belong to their starting weekday. All times follow your
computer’s local timezone; reset days use calendar dates, including DST.

By default only the active tab in the focused browser window counts. Chrome's idle
state pauses foreground accounting after 60 seconds without input. Optional audio
tracking also counts audible background tabs; system lock pauses all accounting.
Foreground heartbeats and active monitoring normally update every second; Chrome
can throttle or suspend callbacks, so this is not a hard real-time guarantee. Gaps longer than 15 seconds are not charged, including most sleep
and suspended-page gaps. A browser restart preserves totals, not the unsettled
interval. This favors avoiding false charges over exact metering.

Nuclear sessions use an immutable snapshot of saved rules. They ignore active
hours. “All websites” ignores the allowlist; the other modes honor the snapshot
allowlist. Changes to unsaved forms do not affect a session. A future session
can be canceled before it starts. Clearing statistics never restores budgets.

## Limits

- Blocking redirects after navigation: a page can load or flash before it is
  replaced. This is a self-control tool, not a network firewall or parental control.
- Background tabs can be redirected when their URL is already blocked. Background
  pages and browser-protected pages do not count toward foreground usage.
- Chrome internal pages, extension pages and restricted domains where Chrome
  prohibits content scripts are outside reliable usage monitoring. Incognito
  is not monitored unless you explicitly allow the extension there.
- OS clock/timezone changes influence schedules. After a backward clock change,
  accounting pauses until the previous checkpoint time is reached again. Disabling/uninstalling the
  extension or editing extension storage can bypass restrictions.
- Distraction controls are independently maintained CSS rules. They hide selected
  elements, not every feed route, and site redesigns may break them. Fixture
  verification is not a guarantee against current signed-in social-site layouts.
- No account/device sync, AI-chat collection, recurring nuclear schedules, or
  media-only nuclear mode. Original StayFocusd settings files are not compatible.
- Statistical website filters classify the hostname root under current saved rules;
  path-specific history is not retained. Budget changes do not retroactively reclassify
  earlier visits, and quota accrual remains restricted to active hours.

See [privacy](../PRIVACY.md), [architecture](architecture.md),
[research findings](research/stayfocusd-4.6.17.md), and
[verification record](verification.md).


## Visual usage dashboard

In Settings → Your usage, select today, the last 7 days or the last 30 days.
All cards, charts, ranking rows and CSV exports follow the same website filter
and search. Switch the metric between visit duration and session count.

- Daily trend shows one point per local calendar date.
- Hourly pattern sums duration in the same clock hour across the selected dates.
  The initial view shows today's hourly pattern.
- Website share shows the top five websites plus Other websites. The full ranking
  and expandable chart values include every website.
- Hover or focus a chart point for its accessible exact value; open View chart
  values to read all data without relying on colors or a pointer.

A session is a continuous eligible period for a hostname, not a page-view count.
Hourly session counts are not stored, so session trends use daily counts. Older
records without hourly duration remain in totals but cannot populate hourly
charts or the busiest-hour card. A note identifies that limitation. History uses
local calendar dates, independently of budget reset time. Optional background
audio can make summed website duration exceed elapsed wall time.

## Changes that do not affect restrictions (0.2.6)

Group names, interface language, group ordering, and the order or duplicates of
identical website/allowlist rules can be saved without confirmations or a typing
challenge, including during exhausted budgets and active focus sessions. Saving
unchanged settings is also allowed. The same checks apply to settings imports.

Group IDs, budgets, enabled flags, website coverage, schedules, reset time,
audio tracking and protection controls must remain equivalent. Renaming plus a
restriction change is checked as one operation, so a harmless edit cannot conceal
a relaxation. Deleting and recreating a group with a new ID is not equivalent.
Pattern validation still normalizes syntax; this exception does not infer that
different wildcard expressions cover the same pages. Existing consumed budgets,
focus policy snapshots/deadlines and queued schedule changes remain intact.

Tightening changes retain the existing rules and any immediate-block confirmation.
During a focus session, only equivalent changes can be saved; the Save button
remains available and invalid changes are rejected by the background controller.

## 水獭额度提醒（v0.3.0）

设置页“水獭的温柔提醒”可以预览形象、关闭形象或关闭声音。
默认开启；修改这两个提醒偏好不需要挑战，也不会改变使用额度。
旧版本设置和导入文件自动补齐这两个偏好。

- 分组共享额度用到 50% 时：从页面底部随机位置浮出，游走总额度的 5%。
- 用到 80% 时：游走总额度的 10%。例如 10 分钟额度对应 30 秒和 60 秒。
- 用完额度时：直接封锁，水獭在额度封锁页持续游走，可点击收起。
- 身体轻轻起伏、头部摆动、双脚交替迈步、尾巴和前爪轻摆。
- 形象在网页可视区域内活动，不会走出 Chrome 或成为桌面悬浮窗。
- 点击水獭或关闭按钮即可收起；不抢焦点，不循环播放声音。
- 50% 和 80% 每个分组、每个额度周期最多首次提醒一次。
  刷新或离开网页会结束这次动画，不补播。
  多个分组同时达到提醒节点时合并显示，以最高进度为准。
- 100% 封锁页重新打开或刷新后仍显示形象，但同一分组当天不重复自动叫。
  零额度直接封锁、强制专注封锁不算“消耗完正额度”。
- 提醒依据后台已累计的真实额度，不依赖是否打开扩展弹窗。
  普通网页提醒仅在前台、实际计时且规则生效时触发。
- 声音是轻柔的合成水獭风格短叫声，不是真实动物录音。
  Chrome 自动播放政策可能阻止声音；可点击“听一声”播放。
  被阻止的声音不会延迟补播。
- 系统开启“减少动态效果”后静止显示；声音仍由独立开关控制。

不请求额外权限、不加载远程资源。提醒进度只在本地保存分组 ID、
额度日期和已提醒节点，不记录访问路径，也不影响浏览统计或防反悔规则。


## 本地文件阅读用时（v0.3.1）

用 Chrome 打开本地 PDF、HTML、文本等 `file://` 标签页后，
前台阅读时间自动累计，无需先打开扩展弹窗。仅在标签页活动、
窗口有焦点且未最小化、电脑未空闲或锁屏时计时。
当前使用 Chrome 的 60 秒空闲判断，长时间不操作的静默阅读也可能暂停。
加载中和已丢弃标签页不计时；本地文件不参加后台有声计时。

- 统计页“筛选网站”选择“本地文件”，可查看每日/小时用时和占比。
- 所有文件合并为一条记录；不会区分或保存具体文件名和路径。
- 弹窗在本地文件上显示今日本地文件总用时，而不是剩余网站额度。
- CSV 使用 `file://` 标识这条合并记录；清除统计与 30 天保留规则照常生效。
- 不读取正文、不解析 PDF、不记录页码、滚动、选区或阅读进度。
- 不向本地文件注入脚本，不增加文件主机权限；无需为本功能打开文件网址访问。
- 本地文件不消耗网站额度，也不被网站限额或强制专注重定向。
- Chrome 标签页以外的阅读器不在统计范围。此功能按 `file://` 标签页识别，
  不通过读取内容判断它是否为 PDF；本地目录列表等文件网址也可能被计时。

商店安装版必须升级到 v0.3.1 才会获得此功能；本地开发版更新不会替换商店版。
测试开发版时请暂时关闭正式版，避免重复的网页拦截和提醒。
