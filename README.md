# My Blog · 个人博客

基于 Astro 的个人信息管理系统：记录技术笔记、生活随笔、职场思考，并承载简历。

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Astro 7+（SSR / 混合渲染） |
| UI 岛屿 | React 19（仅用于交互组件） |
| 样式 | Tailwind CSS v4 + CSS 变量（暗色模式无 FOUC） |
| 内容 | Git-based：文章/标签 Markdown 存在**独立的私密内容仓库**，构建前由 `scripts/sync-content.mjs` clone 到 `.content-private/`（不入主仓库） |
| 鉴权 | Astro middleware + HMAC token cookie，单管理员 |
| 部署 | Vercel（`@astrojs/vercel` adapter） |
| 包管理 | pnpm |

## 项目结构

```text
src/
├── content.config.ts        # Content Collections schema（posts + tags，zod 校验）
├── env.d.ts                 # App.Locals.isAdmin 等运行时类型声明
├── content/                 # 仅保留 schema 占位；文章/标签源在外置私密仓库
├── lib/
│   ├── constants.ts         # 领域/类别/导航枚举（单一来源）
│   ├── visibility.ts        # 可见性过滤的单一事实源（权限命脉）
│   ├── auth.ts              # 密码校验 + HMAC token
│   ├── csrf.ts              # 同源校验（防 CSRF）
│   ├── rateLimit.ts         # 登录速率限制（失败计数 + 锁定窗口）
│   └── heatmap.ts           # About 页热力图聚合（内部调 filterVisiblePosts）
├── middleware.ts            # 每请求注入 Astro.locals.isAdmin
├── layouts/BaseLayout.astro # 含暗色模式阻塞脚本
├── components/              # Header / PostCard / PostList / PostListPage / CardCarousel / Toc / ThemeToggle / SearchBox / Heatmap
├── pages/
│   ├── index.astro          # 首页
│   ├── about.astro          # About（含写作频率热力图）
│   ├── resume.astro         # 简历
│   ├── login.astro          # 管理员登录
│   ├── logout.astro         # 登出（清 cookie 后回首页）
│   ├── 404.astro            # 404 页
│   ├── api/search.json.ts   # 搜索索引端点（经 filterVisiblePosts）
│   ├── posts/
│   │   ├── index.astro      # 文章列表
│   │   ├── [slug].astro     # 文章详情（右侧 TOC，二级标题跳转）
│   │   ├── [slug].md.ts     # 单篇 Markdown 导出端点（经 getVisiblePost）
│   │   ├── _domain.ts       # 分类页共享逻辑
│   │   └── {tech,life,career,other}.astro  # 四个领域分类页
│   └── tags/
│       ├── index.astro      # 标签集合页
│       └── [tag].astro      # 标签详情页
scripts/
└── sync-content.mjs         # predev/prebuild 钩子：clone/pull 私密内容仓库到 .content-private/
.content-private/            # （gitignore）私密内容 clone 目标，不进主仓库
docs/                        # 文档（见 docs/README.md 导航）
AGENTS.md                    # AI 协作约定（commit 规范、可见性约束、dev server）
```

## 数据模型

**文章 frontmatter：**

```yaml
---
title: 标题
category: article | diary | resume | page   # 类别
domain: tech | life | career | other        # 领域
published: 2026-08-08
updated: 2026-08-09                           # 可选，最后更新日期
excerpt: 可选摘要                             # 可选，搜索索引与列表展示用
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

**知识卡片（cards）：**

```yaml
---
title: 名词或短语           # 知识点名，如「贝叶斯定理」
domain: tech               # 与 posts 同枚举，决定在哪个列表页轮播
published: 2026-08-09
tags: [statistics]         # 引用 tag slug；绑 private 标签则卡片间接私密
draft: false               # dev 可见，build 排除
private: false             # 显式私密（也可由 private 标签间接判定）
---

正文是一段简短解释，正文里不写一级标题（与文章一致，由模板渲染标题）。
```

> 卡片不设 `category` / `excerpt`（弹窗内直接渲染 body），不出现在文章列表/搜索索引里，仅以弹窗形式在 posts 列表页顶部轮播展示（首页、四个领域分类页、文章列表页、标签详情页）。

> 实际动手写文章 / 建标签 / 建卡片 / 绑定的逐步流程与易踩坑，见 [`docs/content-guide.md`](./docs/content-guide.md)。

## 权限模型

- 访客：看不到 `draft`（生产）、`private: true` 的文章/卡片，也看不到任何绑定了 private 标签的文章/卡片——不出现在列表、不可访问 URL、不被搜索命中、不进卡片轮播。
- 管理员：通过 `/login` 输入密码登录后，线上也能看到全部内容（Header 显示「登出」入口）。
- **所有可见性判断必须经过 `src/lib/visibility.ts`**——文章用 `filterVisiblePosts(isAdmin)` / `getVisiblePost`，知识卡片用 `filterVisibleCards` / `filterVisibleCardsByDomain` / `filterVisibleCardsByTag`，不允许在调用处自行 if，避免漏判导致私密内容泄露。
- 搜索索引端点（`/api/search.json`）、单篇导出端点（`/posts/[slug].md`）、About 页热力图聚合（`src/lib/heatmap.ts`）**全部经 `filterVisiblePosts` / `getVisiblePost`**——私密文章对访客不进索引、不可导出、不计入热力图。
- 知识卡片轮播入口（`src/components/CardCarousel.astro`）由 `src/pages/index.astro`、`src/pages/posts/**`、`src/pages/tags/[tag].astro` 调用，数据均在调用方经 `filterVisibleCards*` 过滤后传入；组件本身不再过滤，故**调用方务必传过滤后的结果**。
- 登录由 `/login`（密码 + HMAC token cookie）与 `/logout`（清 cookie）处理，含速率限制（`src/lib/rateLimit.ts`）与 CSRF 同源校验（`src/lib/csrf.ts`）。部署流程见 `docs/vercel-deploy.md`。

## 常用命令

| 命令 | 作用 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动本地开发服务器（`localhost:4321`） |
| `pnpm build` | 构建生产版本到 `./dist/` |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm astro check` | TypeScript + Astro 类型检查 |
| `set -a; . ./.env; set +a` | 加载 .env 文件全部环境变量 |
| `pnpm dev --host` | 启动本地开发服务器并暴露 host |
| `pnpm exec astro dev stop` | 停止本地服务器 |

## 环境变量

复制 `.env.example` 为 `.env` 并填入真实值（`.env` 不入库）：

- `ADMIN_PASSWORD`：管理员登录密码
- `JWT_SECRET`：token 签名密钥（用 `openssl rand -hex 32` 生成）
- `CONTENT_REPO_URL`：私密内容仓库地址（文章/标签 Markdown 的源），如 `https://github.com/your-name/blog-content.git`
- `CONTENT_REPO_TOKEN`：访问私密内容仓库的 GitHub PAT（fine-grained，仅 Contents: Read）。留空则直接用 `CONTENT_REPO_URL`（依赖本机 SSH/git 凭据）

> 内容源是**独立私密仓库**：`pnpm dev` / `pnpm build` 前的 `predev` / `prebuild` 钩子会执行 `scripts/sync-content.mjs`，按上述变量 clone/pull 到 `.content-private/`（被 `.gitignore` 忽略）。这样公开主仓库不含任何文章原文，clone 出来也看不到私密内容。生产环境把这两个变量配在 Vercel 项目的 Settings → Environment Variables。

## 日常工作流

内容与代码分居两个仓库，日常改动按**目标**走两条不同路径：

**写 / 改文章、标签**（→ 私密内容仓库 `special-obstacle-blog-content`）

1. 在内容仓库的工作区（本地 clone，如 `D:\Codebase\special-obstacle-blog-content`）改 `posts/*.md` 或 `tags/*.yml`。新建文章/卡片可直接在主仓库跑 `pnpm new <slug>` 脚手架（用法见 [`docs/content-guide.md`](docs/content-guide.md)），自动生成模板到 `.content-private/`。
2. `git add` + `git commit` + `git push` 到私密内容仓库（用你账号的 SSH key / PAT 鉴权，与主仓库的只读 PAT 无关）。
3. 回主仓库跑 `pnpm dev` 预览 —— `predev` 钩子会自动 `git pull` 最新内容到 `.content-private/`。
4. 确认无误即完成。**内容改动不进主仓库**，线上由 Vercel 下次构建时自动拉取。
   - 想让线上立即更新：在主仓库推一个触发提交，或在 Vercel 点 Redeploy。

**改代码 / schema / 配置 / 文档**（→ 主仓库 `special-obstacle-blog`）

1. 在主仓库改（schema 在 `src/content.config.ts`，文档在 `docs/`、`README.md`、`AGENTS.md`）。
2. 直接在 `main` 分支 `git commit`（中文约定式）+ `git push`。
3. Vercel 监听 `main`，push 后自动触发部署；构建前 `prebuild` 钩子会拉取最新内容。

> 详细的新建标签 / 新建文章 / 绑定标签的操作步骤见 [`docs/content-guide.md`](docs/content-guide.md)。

## 开发进度

- ✅ 阶段 1（MVP）：脚手架、数据模型、可见性系统、鉴权基建、首页/列表/详情、暗色模式
- ✅ 阶段 2：分类页 / 标签集合页 / 标签详情页 / About / Resume / 404
- ✅ 阶段 3：部署 Vercel + 线上密码门（`/login`、`/logout`、速率限制、CSRF；见 `docs/vercel-deploy.md`）
- ✅ 阶段 4：全站搜索（MiniSearch）、单篇导出 Markdown、About 页写作频率热力图
- ✅ 阶段 5：完善 `docs/`（导航索引 + 归档历史提示词）、精简 `AGENTS.md`（补 commit 规范与可见性约束）、修正 README 与代码不符之处
- ✅ 阶段 6：知识卡片（类 Zettelkasten 弹窗轮播）——新增 `cards` collection、`filterVisibleCards*` 可见性出口、`CardCarousel` 组件，接入首页 / 四领域分类页 / 文章列表页 / 标签详情页

## 协作约定

- TypeScript strict
- commit message 用中文，约定式格式（`feat:` / `fix:` / `docs:` / `chore:`）
- 详见 `AGENTS.md`
