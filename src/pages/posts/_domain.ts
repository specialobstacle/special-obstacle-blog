import {
  filterVisiblePosts,
  filterVisibleCardsByDomain,
  type PostEntry,
  type CardEntry,
} from '../../lib/visibility';
import { DOMAINS, DOMAIN_LABELS, type Domain } from '../../lib/constants';

/**
 * 分类页共享数据获取逻辑。
 *
 * 四个字面量路由（tech/life/career/other）共用此函数，
 * 避免与 [slug].astro 的 catch-all 路由冲突，同时零重复代码。
 *
 * 同时取该领域下的可见知识卡片，供列表页顶部轮播入口使用。
 * 卡片走 filterVisibleCardsByDomain（visibility.ts 的 cards 出口）。
 *
 * 非法 domain（理论上不会发生，因路由是字面量文件）→ notFound=true，
 * 调用方据此 redirect('/404')。
 */
export async function getDomainPosts(
  domain: Domain,
  isAdmin: boolean,
): Promise<{
  posts: PostEntry[];
  cards: CardEntry[];
  label: string;
  notFound: boolean;
}> {
  if (!DOMAINS.includes(domain)) {
    return { posts: [], cards: [], label: '', notFound: true };
  }
  const [all, cards] = await Promise.all([
    filterVisiblePosts(isAdmin),
    filterVisibleCardsByDomain(domain, isAdmin),
  ]);
  const posts = all.filter((p) => p.data.domain === domain);
  return { posts, cards, label: DOMAIN_LABELS[domain], notFound: false };
}
