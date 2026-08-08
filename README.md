# My Blog · 个人博客

基于 Astro 的个人信息管理系统：记录技术笔记、生活随笔、职场思考，并承载简历。

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Astro 7+（SSR / 混合渲染） |
| UI 岛屿 | React 19（仅用于交互组件） |
| 样式 | Tailwind CSS v4 + CSS 变量（暗色模式无 FOUC） |
| 内容 | Git-based：文章是 `src/content/posts/*.md`，标签是 `src/content/tags/*.yml` |
| 鉴权 | Astro middleware + HMAC token cookie，单管理员 |
| 部署 | Vercel（`@astrojs/vercel` adapter） |
| 包管理 | pnpm |

## 项目结构

```text
src/
├── content.config.ts        # Content Collections schema（posts + tags，zod 校验）
├── content/
│   ├── posts/*.md           # 文章（frontmatter 见下方）
│   └── tags/*.yml           # 标签（含 private 标志）
├── lib/
│   ├── constants.ts         # 领域/类别/导航枚举（单一来源）
│   ├── visibility.ts        # 可见性过滤的单一事实源（权限命脉）
│   └── auth.ts              # 密码校验 + HMAC token
├── middleware.ts            # 每请求注入 Astro.locals.isAdmin
├── layouts/BaseLayout.astro # 含暗色模式阻塞脚本
├── components/              # Header / PostCard / PostList / Toc / ThemeToggle
├── pages/
│   ├── index.astro          # 首页
│   └── posts/
│       ├── index.astro      # 文章列表
│       └── [slug].astro     # 文章详情（右侧 TOC，二级标题跳转）
└── styles/global.css        # 设计 token + prose 排版
docs/                        # 搭建/部署/运维命令记录
AGENTS.md                    # AI 协作约定（ZCode 等）
```

## 数据模型

**文章 frontmatter：**

```yaml
---
title: 标题
category: article | diary | resume | page   # 类别
domain: tech | life | career | other        # 领域
published: 2026-08-08
tags: [astro, frontend]                      # 引用 tag slug
draft: false                                  # dev 可见，build 排除
private: false                                # 显式私密（也可由 private 标签间接判定）
note: 可选备注                                 # 仅元数据用途，前台不展示
---
```

**标签：**

```yaml
name: 显示名
private: false      # 私密标签绑定的文章仅管理员可见
description: 简介
```

## 权限模型

- 访客：看不到 `draft`（生产）、`private: true` 的文章，也看不到任何绑定了 private 标签的文章——不出现在列表、不可访问 URL、不被搜索命中。
- 管理员：通过 `/login` 输入密码登录后，线上也能看到全部内容（Header 显示「登出」入口）。
- **所有可见性判断必须经过 `src/lib/visibility.ts` 的 `filterVisiblePosts(isAdmin)`**，不允许在调用处自行 if，避免漏判导致私密内容泄露。
- 登录由 `/login`（密码 + HMAC token cookie）与 `/logout`（清 cookie）处理，含速率限制（`src/lib/rateLimit.ts`）与 CSRF 同源校验（`src/lib/csrf.ts`）。部署流程见 `docs/vercel-deploy.md`。

## 常用命令

| 命令 | 作用 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动本地开发服务器（`localhost:4321`） |
| `pnpm build` | 构建生产版本到 `./dist/` |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm astro check` | TypeScript + Astro 类型检查 |

## 环境变量

复制 `.env.example` 为 `.env` 并填入真实值（`.env` 不入库）：

- `ADMIN_PASSWORD`：管理员登录密码
- `JWT_SECRET`：token 签名密钥（用 `openssl rand -hex 32` 生成）

## 开发进度

- ✅ 阶段 1（MVP）：脚手架、数据模型、可见性系统、鉴权基建、首页/列表/详情、暗色模式
- ✅ 阶段 2：分类页 / 标签集合页 / 标签详情页 / About / Resume / 404
- ⏳ 阶段 3：部署 Vercel + 线上密码门（`/login`、`/logout`、速率限制、CSRF 已就绪，待部署；见 `docs/vercel-deploy.md`）
- ⏳ 阶段 4：搜索 / 导出 / About 热力图
- ⏳ 阶段 5：完善 `docs/` 与 `AGENTS.md`

## 协作约定

- TypeScript strict
- commit message 用中文，约定式格式（`feat:` / `fix:` / `docs:` / `chore:`）
- 详见 `AGENTS.md`
