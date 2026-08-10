import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * 可见性过滤 —— 权限系统的单一事实源。
 *
 * 规则（任一命中即对非管理员隐藏）：
 *   1. post.data.draft === true            （构建/生产默认排除草稿）
 *   2. post.data.private === true          （显式私密）
 *   3. post 绑定了任一 private 标签          （间接私密）
 *
 * 所有列表、详情、搜索索引、导出都必须经过 filterVisible，
 * 不允许在调用处自行判断，避免漏判导致私密内容泄露。
 *
 * 知识卡片（cards）遵循完全相同的规则，对应 filterVisibleCards* 出口。
 *
 * 注意：dev 环境下草稿对所有人可见（Astro 行为 + 本函数也放行），
 * 仅生产构建排除草稿。私密内容则始终受 isAdmin 控制。
 */

export type PostEntry = CollectionEntry<'posts'>;
export type TagEntry = CollectionEntry<'tags'>;
export type CardEntry = CollectionEntry<'cards'>;

/** 读取所有私密标签的 id 集合 */
export async function getPrivateTagIds(): Promise<Set<string>> {
  const tags = await getCollection('tags');
  return new Set(tags.filter((t) => t.data.private).map((t) => t.id));
}

/**
 * 判断单篇文章对当前 viewer 是否可见。
 * 不做 dev 判断——dev 是否显示草稿由调用方按 import.meta.env.DEV 决定。
 */
export function isPostVisible(
  post: PostEntry,
  privateTagIds: Set<string>,
  isAdmin: boolean,
): boolean {
  // 管理员看一切（草稿 + 私密都可见）
  if (isAdmin) return true;

  // 访客：私密（显式或标签间接）一律隐藏
  if (post.data.private) return false;
  if (post.data.tags.some((slug) => privateTagIds.has(slug))) return false;

  // 访客：草稿在生产环境隐藏，dev 环境可见
  if (post.data.draft && !import.meta.env.DEV) return false;

  return true;
}

/**
 * 过滤集合 —— 列表/搜索/导出统一入口。
 */
export async function filterVisiblePosts(
  isAdmin: boolean,
): Promise<PostEntry[]> {
  const [posts, privateTagIds] = await Promise.all([
    getCollection('posts'),
    getPrivateTagIds(),
  ]);
  return posts
    .filter((p) => isPostVisible(p, privateTagIds, isAdmin))
    .sort(
      (a, b) => b.data.published.getTime() - a.data.published.getTime(),
    );
}

/** 单篇详情页使用：根据 slug 取可见文章，找不到或不可见返回 null */
export async function getVisiblePost(
  slug: string,
  isAdmin: boolean,
): Promise<PostEntry | null> {
  const privateTagIds = await getPrivateTagIds();
  const posts = await getCollection('posts');
  const post = posts.find((p) => p.id === slug || p.data.title === slug);
  if (!post) return null;
  return isPostVisible(post, privateTagIds, isAdmin) ? post : null;
}

/** 带文章计数的标签条目，供标签集合页使用 */
export interface VisibleTag {
  tag: TagEntry;
  /** 该标签下对当前 viewer 可见的文章数 */
  count: number;
}

/**
 * 取当前 viewer 可见的标签集合 —— 标签层面的单一事实源。
 *
 * 可见性「按文章派生」：先拿可见文章，再收集这些文章引用的标签 slug。
 * 因此私密标签绑定的文章对访客已被 filterVisiblePosts 过滤，
 * 这些标签自然不会出现在访客视图中。
 *
 * 额外兜底：非管理员再剔除一次 data.private 标签，
 * 防止「标签声明了 private 但没有文章引用」这种数据不一致导致泄露。
 */
export async function getVisibleTags(
  isAdmin: boolean,
): Promise<VisibleTag[]> {
  const [visiblePosts, tags] = await Promise.all([
    filterVisiblePosts(isAdmin),
    getCollection('tags'),
  ]);

  // 统计每个被可见文章引用的标签出现次数
  const counts = new Map<string, number>();
  for (const post of visiblePosts) {
    for (const slug of post.data.tags) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }

  return tags
    .filter((tag) => counts.has(tag.id))
    .filter((tag) => isAdmin || !tag.data.private)
    .map((tag) => ({ tag, count: counts.get(tag.id) ?? 0 }))
    .sort(
      (a, b) => b.count - a.count || a.tag.data.name.localeCompare(b.tag.data.name),
    );
}

/**
 * 取某标签下对当前 viewer 可见的文章。
 *
 * 返回的 tag 为 null 时调用方应 404 —— 覆盖三种不可见情形：
 *   1. 标签不存在
 *   2. 标签 private 且非管理员
 *   3. 标签下没有任何可见文章（如全是草稿/私密）
 * 绝不向访客暴露标签存在性。
 */
export async function getVisiblePostsByTag(
  slug: string,
  isAdmin: boolean,
): Promise<{ tag: TagEntry | null; posts: PostEntry[] }> {
  const [visiblePosts, tags] = await Promise.all([
    filterVisiblePosts(isAdmin),
    getCollection('tags'),
  ]);
  const tag = tags.find((t) => t.id === slug) ?? null;

  // 不存在 或 私密且非管理员 → 视作不可见
  if (!tag || (!isAdmin && tag.data.private)) {
    return { tag: null, posts: [] };
  }

  const posts = visiblePosts.filter((p) => p.data.tags.includes(slug));
  // 该标签下没有任何可见文章 → 同样不暴露
  if (posts.length === 0) {
    return { tag: null, posts: [] };
  }

  return { tag, posts };
}

// ──────────────────────────────────────────────────────────────────────
// 知识卡片（cards）可见性 —— 与 posts 完全同构，规则同上。
// 任何输出卡片内容的页面/组件都必须经过这里的出口，不允许调用处自行 if。
// ──────────────────────────────────────────────────────────────────────

/**
 * 判断单张知识卡片对当前 viewer 是否可见。逻辑与 isPostVisible 一致，
 * 复用同一份 privateTagIds（cards 与 posts 共享 tags 集合）。
 */
export function isCardVisible(
  card: CardEntry,
  privateTagIds: Set<string>,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (card.data.private) return false;
  if (card.data.tags.some((slug) => privateTagIds.has(slug))) return false;
  if (card.data.draft && !import.meta.env.DEV) return false;
  return true;
}

/** 过滤可见卡片 —— 按 published 倒序，供弹窗轮播入口统一调用 */
export async function filterVisibleCards(
  isAdmin: boolean,
): Promise<CardEntry[]> {
  const [cards, privateTagIds] = await Promise.all([
    getCollection('cards'),
    getPrivateTagIds(),
  ]);
  return cards
    .filter((c) => isCardVisible(c, privateTagIds, isAdmin))
    .sort(
      (a, b) => b.data.published.getTime() - a.data.published.getTime(),
    );
}

/**
 * 取某领域下对当前 viewer 可见的卡片 —— posts 列表页顶部轮播入口的唯一出口。
 * 领域不合法返回空数组（调用方据此跳过轮播渲染）。
 */
export async function filterVisibleCardsByDomain(
  domain: string,
  isAdmin: boolean,
): Promise<CardEntry[]> {
  const cards = await filterVisibleCards(isAdmin);
  return cards.filter((c) => c.data.domain === domain);
}

/**
 * 取某标签下对当前 viewer 可见的卡片 —— 标签详情页轮播入口。
 *
 * 不重复标签存在性/私密性判断：调用方（[tag].astro）已先经
 * getVisiblePostsByTag 决定是否 404，能进到本函数说明标签已确认可见。
 * 本函数只做该标签下卡片的纯过滤。
 */
export async function filterVisibleCardsByTag(
  slug: string,
  isAdmin: boolean,
): Promise<CardEntry[]> {
  const cards = await filterVisibleCards(isAdmin);
  return cards.filter((c) => c.data.tags.includes(slug));
}
