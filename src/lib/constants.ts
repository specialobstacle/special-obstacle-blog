/**
 * 全站共享常量：领域、类别、导航等。
 *
 * 集中定义的原因：frontmatter schema、UI 筛选、URL 路由、文档说明
 * 都要引用同一组枚举，必须保证完全一致，避免散落修改导致漂移。
 */

/** 帖子领域：与导航栏 Tech/Life/Career 一一对应（other 为兜底） */
export const DOMAINS = ['tech', 'life', 'career', 'other'] as const;
export type Domain = (typeof DOMAINS)[number];

/** 帖子类别：文章 / 日记 / 简历 / 页面 */
export const CATEGORIES = ['article', 'diary', 'resume', 'page'] as const;
export type Category = (typeof CATEGORIES)[number];

/** 领域 → 中文显示名（导航与列表筛选用） */
export const DOMAIN_LABELS: Record<Domain, string> = {
  tech: '技术',
  life: '生活',
  career: '职场',
  other: '其他',
};

/** 类别 → 中文显示名 */
export const CATEGORY_LABELS: Record<Category, string> = {
  article: '文章',
  diary: '日记',
  resume: '简历',
  page: '页面',
};

/**
 * 导航主菜单。Posts 下拉子项由 DOMAINS 派生。
 * 新增导航项只需改这里，Header 组件会自动跟随。
 */
export const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/posts', label: 'Posts', children: DOMAINS.map((d) => ({
      href: `/posts/${d}`,
      label: DOMAIN_LABELS[d],
    })) },
  { href: '/tags', label: 'Tags' },
  { href: '/about', label: 'About' },
  { href: '/resume', label: 'Resume' },
] as const;
