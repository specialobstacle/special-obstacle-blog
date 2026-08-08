/**
 * 登录防暴力：内存计数速率限制（最小可用实现）。
 *
 * 策略：同一来源 IP 在 `WINDOW_MS`（10 分钟）内失败 `MAX_FAILS`（5 次）后，
 * 锁定 `LOCK_MS`（10 分钟），锁定期内一律拒绝。
 *
 * 实现说明与限制：
 *   - 模块级 Map 存在单实例进程内存里。Vercel Serverless 单实例够用，
 *     但冷启动/多实例时计数会分散——本阶段可接受，后续如需更强可换 Edge Config / Upstash。
 *   - 进程重启即清空（锁定会提前解除），对登录场景风险极低。
 *   - 每次 API 调用顺带惰性清理过期条目，防止长期运行 Map 无限增长。
 *
 * 安全：失败才计数，成功即清零——避免正常用户偶发输错被误锁。
 */

const MAX_FAILS = 5;
/** 计数窗口：10 分钟 */
const WINDOW_MS = 10 * 60 * 1000;
/** 锁定时长：10 分钟 */
const LOCK_MS = 10 * 60 * 1000;

interface Bucket {
  /** 窗口内累计失败次数 */
  fails: number;
  /** 窗口内首次失败时间（用于判断窗口是否滑过） */
  firstFailAt: number;
  /** 锁定截止时间戳；0 表示未锁定 */
  lockedUntil: number;
}

const buckets = new Map<string, Bucket>();

/** 惰性清理已过期的窗口与锁，避免长期运行后 Map 无限增长 */
function sweep(now: number): void {
  for (const [ip, b] of buckets) {
    // 窗口已滑过且未在锁定中 → 清掉
    if (now - b.firstFailAt > WINDOW_MS && b.lockedUntil <= now) {
      buckets.delete(ip);
    }
  }
}

/**
 * 检查某 IP 是否允许尝试登录。
 * 不改变状态——失败计数由 recordLoginFailure 推进。
 */
export function checkLoginRate(ip: string): {
  allowed: boolean;
  /** 被锁时给出剩余秒数，供 UI 提示；放行时为 0 */
  retryAfterSeconds: number;
} {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(ip);
  if (!b || b.lockedUntil <= now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  const retryAfterSeconds = Math.ceil((b.lockedUntil - now) / 1000);
  return { allowed: false, retryAfterSeconds };
}

/** 记录一次失败：累计达阈值则进入锁定 */
export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(ip);
  if (!b || now - b.firstFailAt > WINDOW_MS) {
    // 没有桶，或窗口已滑过 → 开新窗口
    buckets.set(ip, { fails: 1, firstFailAt: now, lockedUntil: 0 });
    return;
  }
  b.fails += 1;
  if (b.fails >= MAX_FAILS) {
    b.lockedUntil = now + LOCK_MS;
  }
}

/** 记录一次成功：清掉该 IP 的计数，避免正常用户偶发失败后被历史拖累 */
export function recordLoginSuccess(ip: string): void {
  buckets.delete(ip);
}
