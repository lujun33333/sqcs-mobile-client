export function normalizeEntry(value) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error('请填写游戏登录网址');
  let url;
  try { url = new URL(text); }
  catch { throw new Error('请填写完整网址，例如 https://game.example.com/'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('网址必须以 http:// 或 https:// 开头');
  if (url.username || url.password) throw new Error('网址中不能包含账号或密码');
  if (url.search || url.hash) throw new Error('请填写固定登录入口，不要包含登录票据或临时参数');
  if (!url.hostname || url.hostname.endsWith('.')) throw new Error('网址中的主机名无效');
  return url.href;
}

export function readEntry(storage, fallback = '') {
  try {
    const saved = storage?.getItem('sqcs.entry');
    if (saved) return normalizeEntry(saved);
  } catch { /* Storage may be unavailable or contain an obsolete value. */ }
  try { return fallback ? normalizeEntry(fallback) : ''; }
  catch { return ''; }
}

export function saveEntry(storage, value) {
  const entry = normalizeEntry(value);
  try { storage?.setItem('sqcs.entry', entry); return { entry, saved: true }; }
  catch { return { entry, saved: false }; }
}

export function isLoopback(entry) {
  const host = new URL(entry).hostname;
  return host === 'localhost' || host === '[::1]' || /^127\./.test(host);
}
