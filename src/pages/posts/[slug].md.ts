import type { APIRoute } from 'astro';

import { getVisiblePost } from '../../lib/visibility';

/**
 * 单篇文章导出端点：返回重组的完整 Markdown 下载。
 *
 * 安全要点：
 *   - 必须经 getVisiblePost(slug, isAdmin)，不可见一律 404（绝不暴露存在性）
 *   - Vary: Cookie，避免缓存层把管理员的私密导出串给访客
 *
 * frontmatter 重组：entry.body 是已剥掉 frontmatter 的正文，
 * 这里按 content.config.ts 的 schema 顺序手写 YAML stringify（不引 js-yaml）。
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const slug = params.slug;
  if (!slug) {
    return new Response('Not Found', { status: 404 });
  }

  const post = await getVisiblePost(slug, locals.isAdmin);
  if (!post) {
    // 与详情页一致：不可见即 404，不暴露存在性
    return new Response('Not Found', { status: 404 });
  }

  const d = post.data;
  const lines: string[] = ['---'];
  lines.push(`title: ${yamlScalar(d.title)}`);
  lines.push(`category: ${d.category}`);
  lines.push(`domain: ${d.domain}`);
  lines.push(`published: ${toDateStr(d.published)}`);
  if (d.updated) lines.push(`updated: ${toDateStr(d.updated)}`);
  if (d.excerpt) lines.push(`excerpt: ${yamlScalar(d.excerpt)}`);
  if (d.tags.length > 0) {
    lines.push('tags:');
    for (const t of d.tags) lines.push(`  - ${t}`);
  }
  if (d.note) lines.push(`note: ${yamlScalar(d.note)}`);
  if (d.draft) lines.push('draft: true');
  if (d.private) lines.push('private: true');
  lines.push('---');

  const markdown = `${lines.join('\n')}\n\n---\n\n${post.body ?? ''}`;

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.md"`,
      Vary: 'Cookie',
    },
  });
};

/** Date → YYYY-MM-DD（本地概念上按日期聚合，用 UTC 切片足够且稳定） */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * YAML 标量安全包装。
 *
 * 纯文本尽量裸输出（可读性好）；当含特殊字符（冒号、井号、换行、首尾空格、
 * 引号）或可能被误判为布尔/数字/null 时，改用双引号 + 转义。
 * 这是手写 stringify 的最小安全实现，覆盖博客标题/摘要的常见情况。
 */
function yamlScalar(s: string): string {
  const needsQuote =
    /[:#]/.test(s) || // 冒号与注释符
    /[\n"'`]/.test(s) || // 换行与各类引号
    /^\s|\s$/.test(s) || // 首尾空格
    /^(true|false|null|~|yes|no|on|off)$/i.test(s) || // YAML 保留字
    /^[-?:,[\]{}&*!|>'%@`]/.test(s) || // YAML 行首指示符
    /^\d/.test(s) || // 数字开头
    /\s$/.test(s);

  if (!needsQuote) return s;
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
