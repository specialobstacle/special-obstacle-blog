// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import { satteri } from '@astrojs/markdown-satteri';
import stripH1 from './src/plugins/strip-h1';

// https://astro.build/config
export default defineConfig({
  // SSR 模式：支持 middleware、密码门、运行时鉴权
  // 单篇页面可通过 `export const prerender = true` 重新静态化
  output: "server",

  // 站点地址（部署后替换为真实域名，影响 sitemap/canonical）
  site: "https://special-obstacle-blog.vercel.app",

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [react()],

  adapter: vercel(),

  // 剥离正文里的 H1：一级标题统一由详情页模板用 frontmatter 的 title 渲染，
  // 正文从 ## 起笔，避免详情页出现两个重复的 H1。stripH1 是 Sätteri mdast 插件，
  // 在默认 Rust 处理器上兜底——即使作者误写 #，也只在标题区出现一次。
  markdown: {
    processor: satteri({ mdastPlugins: [stripH1] }),
  },
});