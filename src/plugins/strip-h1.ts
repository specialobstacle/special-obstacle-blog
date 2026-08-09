import { defineMdastPlugin } from 'satteri';
import type { Heading } from 'mdast';

/**
 * 剥离 Markdown 正文里所有一级标题（H1）。
 *
 * 约定：一篇文章只有一个 H1，由详情页模板用 frontmatter 的 `title` 自动渲染。
 * 正文应从二级标题（`##`）起笔。此插件作为兜底——即使作者在正文里误写了 `#`，
 * 也只会在详情页标题区出现一次，不会重复展示。
 *
 * 这是 Sätteri（Astro 7 默认 Markdown 处理器）的 mdast 访问者插件，
 * 而非 unified/remark transformer。
 */
const stripH1 = defineMdastPlugin({
  name: 'strip-h1',
  heading(node: Heading, context) {
    if (node.depth === 1) {
      context.removeNode(node);
    }
  },
});

export default stripH1;
