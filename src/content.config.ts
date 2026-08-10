import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

import { DOMAINS, CATEGORIES } from './lib/constants';

/**
 * Content Collections schema.
 *
 * Astro v7 用 glob loader + zod。frontmatter 不符合 schema 的文件
 * 在 dev/build 时会直接报错，避免脏数据上线。
 *
 * 注意：tags 与 posts 是两个独立集合。posts.frontmatter.tags
 * 引用的是 tag 的 slug（文件名，去掉扩展名），运行时再 join。
 *
 * 内容源外置：Markdown / YAML 文件不在本仓库，而在独立的私密内容仓库里。
 * predev/prebuild 钩子（scripts/sync-content.mjs）会把它 clone 到 .content-private/。
 * 公开仓库 clone 出来不含任何文章原文。
 */
const CONTENT_BASE = './.content-private';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: `${CONTENT_BASE}/posts` }),
  schema: z.object({
    /** 标题（必填） */
    title: z.string(),
    /** 类别：文章 / 日记 / 简历 / 页面 */
    category: z.enum(CATEGORIES),
    /** 领域：技术 / 生活 / 职场 / 其他 */
    domain: z.enum(DOMAINS),
    /** 发布日期（用于排序与热力图）。开发期 dev 也能看到 draft 文章 */
    published: z.coerce.date(),
    /** 更新日期，可选 */
    updated: z.coerce.date().optional(),
    /** 摘要，可选（列表页与搜索索引使用） */
    excerpt: z.string().optional(),
    /** 绑定的标签 slug 列表，引用 tags 集合 */
    tags: z.array(z.string()).default([]),
    /** 备注：仅管理员元数据用途，前台不展示 */
    note: z.string().optional(),
    /** 草稿：dev 可见，build 默认排除（构建期可被私密逻辑覆盖） */
    draft: z.boolean().default(false),
    /** 显式私密标记：也可由绑定的 private 标签间接判定 */
    private: z.boolean().default(false),
  }),
});

const tags = defineCollection({
  loader: glob({ pattern: '**/*.{yml,yaml}', base: `${CONTENT_BASE}/tags` }),
  schema: z.object({
    /** 显示名 */
    name: z.string(),
    /** 权限：私密标签绑定的文章仅管理员可见 */
    private: z.boolean().default(false),
    /** 简介，可选 */
    description: z.string().optional(),
  }),
});

/**
 * 知识卡片（Knowledge Cards）—— 类 Zettelkasten 的短知识点。
 *
 * 与 posts 的区别：
 *   - 标题是一个名词或短语（知识点名），正文是一段简短解释
 *   - 不设 category（卡片本身就是一种类型），不设 excerpt（弹窗内直接渲染 body）
 *   - 不出现在文章列表/搜索索引里，仅以弹窗形式在 posts 列表页顶部轮播展示
 *
 * 可见性规则与 posts 完全一致（draft / private / private 标签间接私密），
 * 统一经 visibility.ts 的 filterVisibleCards* 出口。
 */
const cards = defineCollection({
  loader: glob({ pattern: '**/*.md', base: `${CONTENT_BASE}/cards` }),
  schema: z.object({
    /** 标题：一个名词或短语，代表一个知识点 */
    title: z.string(),
    /** 领域：与 posts 同枚举，决定在哪个 posts 列表页轮播 */
    domain: z.enum(DOMAINS),
    /** 发布日期，用于排序 */
    published: z.coerce.date(),
    /** 绑定的标签 slug 列表，引用 tags 集合（可见性亦受 private 标签影响） */
    tags: z.array(z.string()).default([]),
    /** 草稿：dev 可见，build 默认排除 */
    draft: z.boolean().default(false),
    /** 显式私密标记：也可由绑定的 private 标签间接判定 */
    private: z.boolean().default(false),
  }),
});

export const collections = { posts, tags, cards };
