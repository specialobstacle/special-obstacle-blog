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
 */

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
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
  loader: glob({ pattern: '**/*.{yml,yaml}', base: './src/content/tags' }),
  schema: z.object({
    /** 显示名 */
    name: z.string(),
    /** 权限：私密标签绑定的文章仅管理员可见 */
    private: z.boolean().default(false),
    /** 简介，可选 */
    description: z.string().optional(),
  }),
});

export const collections = { posts, tags };
