// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

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
});