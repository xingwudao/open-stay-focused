// Translate only original interface nodes. User-authored names and URLs stay intact.
const zh = {
 'Open Stay Focused · Your attention':'Open Stay Focused · 你的注意力',
 'A little less noise.':'少一点干扰。', 'Settings sections':'设置分类',
 'Website budgets':'网站额度','Active hours':'生效时段','Focus session':'专注时段','Less distraction':'减少干扰','Your usage':'使用统计','Settings & data':'设置与数据',
 'On your device.':'保存在你的设备上。','No account. No tracking.':'无需账户。不追踪。','YOUR SPACE TO FOCUS':'属于你的专注空间',
 'Your attention,':'你的注意力，','on your terms.':'由你做主。','Give distracting websites a budget.':'为让你分心的网站设定额度。','Keep the rest of your day for what matters.':'把剩下的时间，留给重要的事。',
 'Sites in a group share one daily allowance.':'同组网站共享每日额度。','A new boundary':'添加一组限制','Group name':'分组名称','Social media':'社交媒体','Daily minutes':'每日分钟数','Website patterns':'网站规则',
 'One per line. Domains include subdomains. Paths are exact; use * to match any path characters. 0 minutes blocks immediately.':'每行一条。域名包含其子域名。路径精确匹配；使用 * 匹配任意路径字符。设为 0 分钟将立即拦截。',
 'Add group':'添加分组','Always welcome':'始终允许','Allowed websites':'允许的网站',
 'Allowed pages override daily budgets. A “block all websites” focus session ignores this list.':'允许的页面不受每日额度限制。“拦截所有网站”的专注时段会忽略此列表。',
 'Budgets apply only during these days and hours.':'额度仅在以下日期和时段生效。','Active days':'生效日期','Time windows':'时间段','Daily budget reset':'每日额度重置时间',
 'One range per line, like 09:00-17:00. 00:00-24:00 means all day. Overnight windows belong to their start day. Times use your device’s local timezone.':'每行一个时间段，例如 09:00-17:00。00:00-24:00 表示全天。跨夜时段归属开始的日期。时间使用设备的本地时区。',
 'A deeper focus':'更深入的专注','A fixed commitment for the work ahead.':'为接下来的工作，留一段坚定的时间。','Nuclear session':'强制专注',
 'Once started, this session cannot be canceled in the extension. Settings stay locked until it ends, even if you restart your browser.':'开始后无法在扩展中取消。结束前设置保持锁定，重启浏览器也不会解除。',
 'Block scope':'拦截范围','Websites in enabled groups':'已启用分组中的网站','All except allowed websites':'除允许列表外的所有网站','All websites':'所有网站','Session minutes':'专注分钟数','Start time (optional)':'开始时间（可选）',
 'Leave empty to start now. Scheduled sessions keep a snapshot of the current saved rules.':'留空即刻开始。预约的专注时段会使用当前已保存规则的快照。',
 'I understand an active session cannot be canceled.':'我理解正在进行的专注时段无法取消。','Commit to focus':'开始专注','Cancel scheduled session':'取消预约专注',
 'Keep the useful parts. Hide the rest.':'保留有用的部分，隐藏其他干扰。',
 'These controls hide selected page elements. Site redesigns can affect them; they are not access restrictions or complete feed blockers.':'这些开关隐藏指定页面元素。网站改版可能影响效果；它们不是访问限制，也不能完全屏蔽信息流。',
 'Where your time goes':'时间都去了哪里','Foreground browsing only. The last 30 local dates stay on this device.':'仅统计前台浏览。最近 30 个本地日期的记录保存在此设备上。','Show usage':'显示记录','Today':'今天','Last 30 days':'最近 30 天','Refresh usage':'刷新统计','Clear usage statistics':'清空使用统计',
 'Clearing statistics does not restore today’s budget or cancel a focus session.':'清空统计不会恢复今日额度，也不会取消专注时段。',
 'A small pause before changing your boundaries.':'修改限制之前，先停顿一下。','Require a typing challenge before changing settings':'修改设置前需要完成输入挑战',
 'The challenge adds friction; browser-level disabling and uninstallation remain possible.':'输入挑战增加修改步骤；仍可在浏览器中禁用或卸载扩展。',
 'Export settings':'导出设置','Import settings':'导入设置',
 'Settings JSON only, up to 256 KiB. Imports replace settings and respect the same locks. Usage and active sessions are never imported.':'仅支持设置 JSON，最大 256 KiB。导入会替换设置，且同样受锁定限制。不会导入使用记录和专注时段。',
 'Open source. Local by design. v0.1.1':'开源。本地运行。v0.1.1','Source & help ↗':'源码与帮助 ↗','Changes stay here until you save.':'修改将在保存后生效。','Save settings':'保存设置',
 'A deliberate change':'一次慎重的修改','Type the sentence exactly':'请准确输入这段文字','Confirm change':'确认修改','Cancel':'取消',
 'A moment of intention.':'把注意力带回当下。','CURRENT WEBSITE':'当前网站','Add this website to':'将此网站添加到','Add website':'添加网站','Settings':'设置','Local budgets. No account. Your rules.':'本地额度。无需账户。由你做主。',
 'A little room to focus':'留一点专注的空间','A BOUNDARY YOU CHOSE':'你为自己设定的限制','Make room for what matters.':'为重要的事，留出空间。','This website is outside your current boundaries.':'此网站超出了你当前设定的限制。','Take a breath. Your next step is yours.':'深呼吸。下一步，由你决定。','Close this tab':'关闭此标签页','View your settings':'查看设置','Your browsing data stays on this device.':'你的浏览数据仅保存在此设备上。',
 'No limit':'无限制','{minutes}m {seconds}s':'{minutes}分{seconds}秒','{time} left':'剩余 {time}','{time} remaining':'剩余 {time}',
 'No groups yet. Start with one website you want more distance from.':'尚无分组。从一个你想少访问的网站开始。','Enabled':'启用','Name':'名称','Minutes per day':'每日分钟数','Patterns':'规则','Remove group':'删除分组',
 'Sun':'周日','Mon':'周一','Tue':'周二','Wed':'周三','Thu':'周四','Fri':'周五','Sat':'周六',
 'YouTube · Shorts':'YouTube · 短视频','YouTube · Recommendations':'YouTube · 推荐','YouTube · Comments':'YouTube · 评论','Instagram · Reels links':'Instagram · Reels 入口','Facebook · Reels links':'Facebook · Reels 入口','X · Trending topics':'X · 热门话题','TikTok · Recommendations':'TikTok · 推荐',
 'Focus session active · {time} remaining. Settings are locked.':'专注进行中 · 剩余 {time}。设置已锁定。','Focus session scheduled for {time}.':'专注已预约至 {time}。','Nothing recorded yet. A little breathing room.':'还没有记录。享受这一刻的清静。',
 'Browser or extension page':'浏览器或扩展页面','Available within your current rules.':'当前规则允许访问。','This page is on your allowlist.':'此页面位于允许列表中。','Budgets apply to HTTP and HTTPS websites.':'额度适用于 HTTP 和 HTTPS 网站。','A focus session is active.':'专注时段正在进行。','Daily budget reached.':'今日额度已用完。','Outside active hours. Your budget is paused.':'当前不在生效时段，额度暂停计时。','New group · 10 min/day':'新分组 · 每日 10 分钟','Distractions':'分心网站','Website added.':'网站已添加。','This page cannot be added.':'无法添加此页面。',
 'Your focus session is holding this space for you. Return when it ends.':'专注时段正在为你守住这片空间。结束后再回来吧。','You have used this website’s daily allowance. Your budget returns at your configured reset time; restrictions apply during active hours.':'此网站的今日额度已用完。额度将在你设定的重置时间恢复；限制仅在生效时段内适用。','Session finished. You can open the website again.':'专注已结束。你可以重新打开网站。',
 'Extension is unavailable. Reload this page.':'扩展暂不可用。请刷新此页面。','Change canceled.':'已取消修改。','Type the sentence exactly before confirming.':'请准确输入这段文字后再确认。',
 'Use times in HH:MM format.':'请使用 HH:MM 格式填写时间。','Invalid time.':'时间无效。','Use time windows like 09:00-17:00.':'请使用 09:00-17:00 这样的时间段格式。','Group added to your draft. Save settings to apply it.':'分组已添加到草稿。保存设置后生效。','Settings saved.':'设置已保存。','Confirm that the session cannot be canceled once active.':'请确认理解专注开始后无法取消。','Focus session committed using your saved rules.':'已使用保存的规则设定专注时段。','Scheduled session canceled.':'已取消预约专注。','Statistics cleared. Existing budgets and focus sessions are unchanged.':'统计已清空。现有额度和专注时段保持不变。','Usage refreshed.':'统计已刷新。','Saved settings exported.':'已导出保存的设置。','Invalid JSON file. Your settings were not changed.':'JSON 文件无效。设置未被修改。','Settings imported.':'设置已导入。',
 'Unexpected or missing settings fields.':'设置字段缺失或包含未知字段。','Too many patterns.':'规则数量过多。','Settings must be at most 256 KiB.':'设置文件不能超过 256 KiB。','Unsupported settings version.':'不支持此设置版本。','Unsupported language.':'不支持此语言。','Use at most 100 groups.':'最多支持 100 个分组。','Group IDs must be unique.':'分组标识必须唯一且有效。','Group names need 1–80 characters.':'分组名称需要 1–80 个字符。','Daily budget must be between 0 and 24 hours.':'每日额度必须在 0 至 24 小时之间。','Use at most 1,000 patterns in total.':'规则总数不能超过 1,000 条。','Invalid active days.':'生效日期无效。','Invalid active hours.':'生效时段无效。','Invalid reset time or challenge setting.':'重置时间或挑战设置无效。','Invalid distraction toggle.':'干扰隐藏开关无效。',
 'Enter a hostname or hostname/path.':'请输入域名或域名/路径。','Patterns cannot contain credentials, ports, queries or fragments.':'规则不能包含凭据、端口、查询参数或片段。','Invalid hostname.':'域名无效。','Use a valid hostname; wildcard hostnames are not supported.':'请使用有效域名；域名不支持通配符。',
 'Unsupported saved state version.':'不支持此保存状态版本。','A trusted extension page is required.':'此操作需要来自可信的扩展页面。','Unknown command.':'未知操作。','Complete the typing challenge first.':'请先完成输入挑战。','A nuclear session is active. Settings are locked until it ends.':'强制专注正在进行。结束前设置保持锁定。','Settings changed in another page. Reload before saving.':'设置已在其他页面修改。请刷新后再保存。','Choose a mode and 1–1,440 minutes.':'请选择模式，时长须为 1–1,440 分钟。','Choose a start time within the next year.':'请选择未来一年内的开始时间。'
};
let language='en';
const originals=[];
if(typeof document!=='undefined'){
 const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode;
  if(!['SCRIPT','STYLE'].includes(node.parentElement?.tagName)&&node.nodeValue.trim())originals.push({node,text:node.nodeValue});
 }
 for(const node of document.querySelectorAll('[placeholder],[title],[aria-label]'))for(const attr of ['placeholder','title','aria-label'])if(node.hasAttribute(attr))originals.push({node,attr,text:node.getAttribute(attr)});
}
export const getLanguage=()=>language;
export function t(source,params={}){
 const template=language==='zh-CN'?(zh[source]??source):source;
 return template.replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(params,key)?String(params[key]):match);
}
export function setLanguage(value){
 language=value==='zh-CN'?'zh-CN':'en';
 if(typeof document==='undefined')return;
 document.documentElement.lang=language;
 for(const {node,attr,text} of originals){
  if(!node.isConnected)continue;
  const translated=text.replace(text.trim(),t(text.trim()));
  if(attr)node.setAttribute(attr,translated);else node.nodeValue=translated;
 }
}
