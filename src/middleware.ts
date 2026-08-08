import { defineMiddleware } from 'astro:middleware';

import { COOKIE_NAME, verifyToken } from './lib/auth';

/**
 * 每请求注入 isAdmin：
 *   - 有有效 admin_token cookie → true
 *   - 否则 → false
 *
 * 可见性过滤在 lib/visibility.ts 统一处理；
 * 此处只负责"识别身份"，不做路由拦截。
 * 静态资源（/public、_astro）不走 middleware。
 */
export const onRequest = defineMiddleware((context, next) => {
  const token = context.cookies.get(COOKIE_NAME)?.value;
  context.locals.isAdmin = verifyToken(token);
  return next();
});
