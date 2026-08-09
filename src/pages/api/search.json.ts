import type { APIRoute } from 'astro';

import { filterVisiblePosts } from '../../lib/visibility';

/**
 * 搜索索引端点（客户端 MiniSearch 的数据源）。
 *
 * 安全要点（不可破坏）：
 *   - 数据源唯一来自 filterVisiblePosts(isAdmin) —— 私密文章对访客不进索引
 *   - 输出**不含 body、不含 private 标记**，最小化泄露面
 *   - 索引内容随 viewer 不同（admin 含私密），用 Vary: Cookie 防止缓存层串权限；
 *     并设 private, no-store，私密内容彻底不缓存
 */
export const GET: APIRoute = async ({ locals }) => {
  const posts = await filterVisiblePosts(locals.isAdmin);
  const index = posts.map((p) => ({
    id: p.id,
    title: p.data.title,
    excerpt: p.data.excerpt ?? '',
    domain: p.data.domain,
    category: p.data.category,
    url: `/posts/${p.id}`,
  }));

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Vary: 'Cookie',
      'Cache-Control': 'private, no-store',
    },
  });
};
