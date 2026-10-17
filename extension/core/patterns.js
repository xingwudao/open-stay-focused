// Patterns have hostname boundaries and anchored, case-sensitive path globs.
export function parsePattern(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 2048) throw new Error('Enter a hostname or hostname/path.');
  const raw = text.trim().replace(/^https?:\/\//i, '');
  if (/[\s@?#:\\]/.test(raw)) throw new Error('Patterns cannot contain credentials, ports, queries or fragments.');
  const slash = raw.indexOf('/');
  const hostText = slash < 0 ? raw : raw.slice(0, slash);
  const path = slash < 0 ? null : raw.slice(slash);
  let host;
  try { host = new URL(`https://${hostText}`).hostname.toLowerCase().replace(/\.$/, ''); } catch { throw new Error('Invalid hostname.'); }
  if (!host || host.includes('*') || host.split('.').some(x => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(x)) || host.length > 253)
    throw new Error('Use a valid hostname; wildcard hostnames are not supported.');
  return {host, path};
}
export function webURL(value) {
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u : null; } catch { return null; }
}
export function matchesPattern(value, pattern) {
  const u = webURL(value); if (!u) return false;
  const p = typeof pattern === 'string' ? parsePattern(pattern) : pattern;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (host !== p.host && !host.endsWith(`.${p.host}`)) return false;
  if (p.path === null) return true;
  // Greedy wildcard matching avoids regular-expression backtracking on
  // user-supplied patterns. Only '*' is special; all other bytes are literal.
  const pathname=u.pathname,glob=p.path;let i=0,j=0,star=-1,retry=0;
  while(i<pathname.length){
    if(j<glob.length&&glob[j]===pathname[i]){i++;j++;}
    else if(glob[j]==='*'){star=j++;retry=i;}
    else if(star!==-1){j=star+1;i=++retry;}
    else return false;
  }
  while(glob[j]==='*')j++;
  return j===glob.length;
}
export const matchesAny = (url, patterns) => patterns.some(p => matchesPattern(url, p));
