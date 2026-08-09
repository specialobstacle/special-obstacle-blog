# 阶段 3 提示词：部署 Vercel + 线上密码门验证

> 用法：开新对话时，直接说「读 `docs/stage-3-prompt.md` 并执行」即可。
> 本文件随项目推进更新（每完成一个阶段，把对应块移除）。

---

## 项目背景（一句话）

Astro v7 SSR + React + Tailwind v4 + Vercel adapter 的个人博客，Git-based 内容存储（文章是 `src/content/posts/*.md`，标签是 `src/content/tags/*.yml`），单管理员密码鉴权（middleware 注入 `Astro.locals.isAdmin`），私密标签绑定的文章对访客完全隐藏。

## 当前进度

- 最新 commit：见 `git log --oneline -1`
- ✅ 阶段 1（MVP）：脚手架、数据模型、可见性系统、鉴权基建、首页/列表/详情、暗色模式
- ✅ 阶段 2：分类页 / 标签集合页 / 标签详情页 / About / Resume / 404
- ⏳ **本次任务：阶段 3**

## 开始前必读

请先读这几个文件再制定计划：

- `README.md`（项目全貌、环境变量、权限模型）
- `AGENTS.md`（协作约定，尤其 dev server 用 background 模式）
- `src/lib/auth.ts`（鉴权核心：`issueToken` / `verifyToken` / `checkPassword` / `COOKIE_NAME` 已就绪）
- `src/middleware.ts`（每请求注入 `Astro.locals.isAdmin`，**只识别身份不拦截路由**）
- `src/lib/visibility.ts`（权限核心，所有列表/详情/搜索/导出必须经 `filterVisiblePosts(isAdmin)`）
- `astro.config.mjs`（已配 `adapter: vercel()` + `output: 'server'`）
- `.env.example`（`ADMIN_PASSWORD` + `JWT_SECRET`）

## 阶段 3 目标

把博客部署到 Vercel，并补齐线上密码门，验证「访客看不到私密内容、管理员登录后可见」在线上真实生效。

### 1. 补齐鉴权 UI（当前缺口，必须先做）

⚠️ **现状**：`src/lib/auth.ts` 已有 `issueToken` / `checkPassword` / `COOKIE_NAME`，middleware 也会读 cookie 注入 `isAdmin`，**但全仓没有任何页面调用这些函数**——`/login` 在 README 里被提到，实际并不存在。这是阶段 3 必须补的洞。

- **`/login` 页**（`src/pages/login.astro`）：
  - 密码输入表单（单字段 + 提交按钮）；可选加一个"显示密码"切换
  - POST 处理：`checkPassword(input)` 通过 → 用 `issueToken()` 签发 token，写入 `httpOnly` + `Secure` + `SameSite=Lax` cookie（`COOKIE_NAME` 来自 `auth.ts`，TTL 30 天已内置），redirect 回 `/` 或 `?next=` 指定的页面
  - 密码错误：回到表单，给出"密码错误"提示（**不暴露具体原因**，统一文案）
  - 已登录访问 `/login`：直接 redirect `/`
- **`/logout`**（`src/pages/logout.astro` 或 login 页内分支）：清掉 cookie，redirect `/`
- **Header 增加登录/登出入口**：访客显示"登录"链接，管理员显示"登出"（`isAdmin` 已在 `Astro.locals`，Header 已在读）。**优先改 `Header.astro` 本身而非 `NAV_ITEMS`**——登录态是运行时判断，不属于静态导航

### 2. 安全加固（线上必须）

- 登录表单防暴力：简单做加法即可——对 `/login` POST 加**速率限制**（同一来源 IP 短时间多次失败后临时拒绝/延时）。Vercel 上可用内存计数（单实例够用）或 Edge Config；本阶段允许"最小可用"实现（如 5 次/10 分钟失败后锁定 10 分钟），但**必须存在**，不能裸奔
- 表单加 CSRF 保护（同源 token 或检查 `Origin` / `Sec-Fetch-Site`），避免跨站提交
- cookie 属性确认：`httpOnly: true`、`secure: true`（生产）、`sameSite: 'lax'`、`path: '/'`

### 3. 部署到 Vercel

- Vercel 项目连接本仓库，导入后自动识别 Astro（`@astrojs/vercel` 已装）
- **环境变量**在 Vercel Dashboard 配置（**不要**写进仓库）：
  - `ADMIN_PASSWORD`：强密码
  - `JWT_SECRET`：`openssl rand -hex 32` 生成的 64 位 hex
- `astro.config.mjs` 的 `site` 从 `https://example.com` 改为真实 Vercel 域名（影响 sitemap/canonical，可在拿到域名后改）
- Node 版本：`package.json` 已声明 `engines.node >= 22.12.0`，确认 Vercel 用 Node 22 runtime（Vercel 读取 `engines.node`；如未生效，加 `vercel.json` 显式指定）

### 4. 线上验证清单

部署成功后，**以访客身份**逐一确认：

- [ ] 首页、`/posts`、四个分类页、`/tags`、公开标签详情页、`/about`、`/resume` 全部 200
- [ ] `/posts/private-diary`、`/tags/private-thoughts` → 跳转 `/404`（不暴露存在性）
- [ ] `/tags` 列表里**看不到**"私密随想"标签
- [ ] 草稿在生产**不可见**（与 dev 不同——`draft-wip` 在线上 `/posts` 应消失）
- [ ] `/login` 表单可见，输错密码给统一错误提示

**以管理员身份**（线上登录后）确认：

- [ ] `/posts/private-diary` 能访问，看到"私密"徽章
- [ ] `/tags` 能看到"私密随想"标签卡片（带"私密"徽章）
- [ ] `/posts/draft-wip`（草稿）可见
- [ ] Header 显示"登出"，点击后回到访客态
- [ ] 登出后再访问私密内容 → 又跳 404

### 5. （可选）预渲染优化

- `/404` 当前是 SSR（阶段 2 确认预渲染会与 `Astro.request.headers` 冲突，已改回 SSR）。如阶段 3 有空，可评估哪些**纯静态页面**（如 `/about`）加 `export const prerender = true` 提速——但**鉴权页与读 `Astro.locals` 的页面绝不预渲染**

## 关键约束（必须遵守）

- **密码校验必须走 `checkPassword`，token 签发必须走 `issueToken`**——不要在页面里自己造 crypto 逻辑
- **cookie 读取/写入统一用 `COOKIE_NAME` 常量**（来自 `auth.ts`），middleware 已在用同一个
- **`Astro.locals.isAdmin` 是唯一身份来源**，UI 显示登录/登出态只读它
- **私密内容的隐藏仍由 `filterVisiblePosts(isAdmin)` 兜底**——登录页是入口，可见性系统是出口，两层独立
- `.env` / `.vercel/` **绝不进 git**（`.gitignore` 已含，不要改坏）
- TypeScript strict；页面用 `.astro`，速率限制/CSRF 等纯逻辑可放 `src/lib/`
- commit message 用**中文**，约定式格式（`feat:` / `fix:` / `docs:` / `chore:` / `ci:`）
- 每完成一个子目标跑 `pnpm dev` 验证；线上验证在部署后做

## 验收标准

- 线上 URL 可访问，访客看不到任何私密内容（文章/标签/草稿）
- 管理员能通过 `/login` 登录并看到全部内容，能登出
- 登录有基础防暴力与 CSRF 保护，cookie 属性安全
- Vercel 构建成功，环境变量配置正确且未泄露

## 执行方式

请先用 **EnterPlanMode** 制定阶段 3 详细计划，确认后再实现。重点关注：
1. `/login` + `/logout` 的具体实现方案（表单处理、cookie 写入、速率限制落点）
2. Header 登录态入口的改法（改 `Header.astro` 还是加 React 岛屿——倾向直接改 Header，它已是 `.astro` 且能读 `Astro.locals`）
3. 速率限制与 CSRF 的最小可用实现选型
