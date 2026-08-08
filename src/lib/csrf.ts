/**
 * 表单 CSRF 防护：同源校验（无状态、零依赖）。
 *
 * 思路：浏览器对跨站请求会带上标准的 Fetch Metadata 头（Sec-Fetch-Site），
 * 优先用它判断；旧浏览器缺失时回退比对 Origin 与 Host。
 * 比起 token 方案，无需额外 cookie/隐藏域，对单管理员登录表单足够。
 *
 * 判定规则（任一放行条件命中即视为同源）：
 *   1. Sec-Fetch-Site === 'same-origin' 或 'same-site'
 *   2. 缺 Sec-Fetch-Site 时，Origin 头与 Host 头同源（含端口）
 *   3. Origin 与 Host 均缺失（某些非浏览器客户端/旧环境）→ 拒绝
 *
 * 注意：此函数仅用于"接受表单 POST 的页面"，GET 不需要。
 */

function sameOrigin(origin: string, host: string): boolean {
  if (!origin || !host) return false;
  try {
    // Origin 形如 https://example.com[:port]，取 host 部分
    const u = new URL(origin);
    return u.host === host;
  } catch {
    return false;
  }
}

/** 判断当前请求是否来自同源（可安全处理 POST） */
export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) {
    // same-origin/same-site 放行；cross-site/none 拒绝
    return fetchSite === 'same-origin' || fetchSite === 'same-site';
  }
  // 回退：比对 Origin 与 Host（均不区分大小写）
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  return sameOrigin(origin.toLowerCase(), host.toLowerCase());
}
