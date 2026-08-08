import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * 单管理员鉴权：密码 + HMAC 签名 token（httpOnly cookie）。
 *
 * 不引入 jsonwebtoken：用 Node 内置 crypto 自己签/验，
 * 依赖更少、行为可控，对单管理员场景完全够用。
 *
 * Token 格式：base64url(payload).base64url(signature)
 * payload: { iat, exp } —— 签发时间与过期时间
 */

const COOKIE_NAME = 'admin_token';
/** 登录态有效期：30 天（秒） */
const TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // 未配置密钥时，开发期给出明确错误，避免悄悄放行
    throw new Error('JWT_SECRET 环境变量未配置');
  }
  return secret;
}

function b64urlEncode(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

/** 签发 token */
export function issueToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ iat: now, exp: now + TTL_SECONDS });
  const payloadB64 = b64urlEncode(payload);
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** 校验 token：签名错误或过期返回 false */
export function verifyToken(token: string | undefined | null): boolean {
  if (!token || !token.includes('.')) return false;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;

  // 用 timingSafeEqual 防止时序攻击
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;

  try {
    const { exp } = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
    return typeof exp === 'number' && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/** 校验管理员密码（timingSafeEqual 防时序） */
export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export { COOKIE_NAME };
