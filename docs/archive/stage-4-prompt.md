# 阶段 4 提示词：搜索 / 导出 / About 热力图

> 用法：开新对话时，直接说「读 `docs/stage-4-prompt.md` 并执行」即可。
> 本文件随项目推进更新（每完成一个阶段，把对应块移除）。

---

## 项目背景（一句话）

Astro v7 SSR + React + Tailwind v4 + Vercel adapter 的个人博客，Git-based 内容存储（文章是 `src/content/posts/*.md`，标签是 `src/content/tags/*.yml`），单管理员密码鉴权（middleware 注入 `Astro.locals.isAdmin`），私密标签绑定的文章对访客完全隐藏。**阶段 3 已完成**：`/login`、`/logout`、速率限制、CSRF、Vercel 部署、线上密码门验证通过。线上域名：`https://special-obstacle-blog.vercel.app`。

## 当前进度

- 最新 commit：见 `git log --oneline -1`
- ✅ 阶段 1（MVP）：脚手架、数据模型、可见性系统、鉴权基建、首页/列表/详情、暗色模式
- ✅ 阶段 2：分类页 / 标签集合页 / 标签详情页 / About / Resume / 404
- ✅ 阶段 3：`/login`、`/logout`、速率限制、CSRF、Vercel 部署、线上验证通过
- ⏳ **本次任务：阶段 4**

## 开始前必读

请先读这几个文件再制定计划：

- `README.md`（项目全貌、权限模型、环境变量）
- `AGENTS.md`（协作约定，尤其 dev server 用 background 模式）
- `src/lib/visibility.ts`（权限核心，**所有列表/详情/搜索/导出必须经 `filterVisiblePosts(isAdmin)`**）
- `src/lib/auth.ts`、`src/middleware.ts`（鉴权基建，阶段 3 已就绪）
- `src/content.config.ts`（数据模型 schema，注意 `excerpt` 是可选字段、`published` 是 `z.coerce.date()`）
- `src/components/ThemeToggle.tsx`（React island 范式：`useEffect` 防 hydration mismatch、Tailwind 内联 className）
- `src/pages/posts/[slug].astro`（文章详情页，`render(entry)` 用法范例）
- `src/pages/about.astro`（热力图占位 div 已在，注释标明阶段 4 替换）
- `src/components/Header.astro`（阶段 3 加了登录/登出入口，搜索框要放这里，别破坏现有布局）

## 阶段 4 目标

新增三个功能：**全站搜索**、**单篇文章导出 Markdown**、**About 页写作频率热力图**。三者都依赖现有可见性系统与 React island 范式。

## 关键技术事实（已调研确认，避免踩坑）

- `entry.body` 是原始 markdown（glob loader 默认 `retainBody:true`），但**已剥掉 frontmatter** → 导出完整 .md 需重组 frontmatter（手写 YAML stringify，不引 js-yaml）
- `post.data.published` 是 JS `Date`，按天聚合用 `toISOString().slice(0,10)`
- Astro v7 SSR endpoint：`src/pages/**.ts` 导出 `GET({ params, locals, request }) => Response`
- React 19（`react` `^19.2.8`），现有唯一 island 是 `ThemeToggle.tsx`
- **所有数据源必须经 `filterVisiblePosts` / `getVisiblePost`**（搜索索引、导出、热力图聚合都走它，否则私密泄露）

## 现实问题：现有文章无 excerpt

4 篇文章（`hello-blog.md`、`typescript-tips.md`、`draft-wip.md`、`private-diary.md`）**都没填 `excerpt`**，搜索会基本搜不到。**实施时补一步：给现有文章补 `excerpt` 字段**（约 30-60 字一句话摘要），让搜索有内容可搜。

---

## 实施步骤

### 模块 A：搜索功能（MiniSearch 客户端搜索）

**决策**：MiniSearch（~8kB 新依赖），SSR 端构建 JSON 索引端点，客户端 island fetch + 搜索。搜索范围仅 `title + excerpt`（不做正文搜索，索引小、实现简）。

**A1. 补 excerpt 字段**
给 `src/content/posts/*.md` 4 篇文章补 `excerpt:` 一句话摘要。

**A2. 新增搜索索引端点 `src/pages/api/search.json.ts`**
- `export async function GET({ locals })`
- `filterVisiblePosts(locals.isAdmin)` 取可见文章
- 输出 JSON：`[{ id, title, excerpt, domain, category, url }]`（**不含 body、不含 private 标记**，最小化泄露面）
- `Cache-Control` 与 `Vary: Cookie`（索引内容随 viewer 不同，避免缓存串权限）

**A3. 新增搜索 UI `src/components/SearchBox.tsx`**（React island）
- `useEffect` 懒加载 MiniSearch：首次聚焦/输入时才 fetch `/api/search.json` 建索引（避免首屏加载全部文章数据）
- 输入框 + 实时结果下拉（显示标题 + excerpt 片段 + 高亮命中词）
- 选结果跳转 `/posts/[slug]`
- 防抖 150ms；空输入隐藏结果；Esc/点外部关闭

**A4. 搜索框放 Header 右侧**（登录按钮旁）
用 `client:idle`（非首屏关键，省 hydration）。**别破坏阶段 3 的登录/登出入口与 admin 徽章布局**。

**A5. 安装依赖**
`pnpm add minisearch`

### 模块 B：导出单篇文章

**决策**：文章详情页加「导出 Markdown」按钮，做 `/posts/[slug].md` 端点返回原始 md 下载。

**B1. 新增端点 `src/pages/posts/[slug].md.ts`**
- `export async function GET({ params, locals })`
- `getVisiblePost(params.slug, locals.isAdmin)` → 不可见返回 404
- 重组完整 markdown：frontmatter（YAML，手写 stringify）+ `\n\n---\n\n` + `entry.body`
- `new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': 'attachment; filename="<slug>.md"' } })`

**B2. 文章详情页加导出按钮**
在 `src/pages/posts/[slug].astro` 文章底部加「导出 Markdown」链接，`href="/posts/<slug>.md"` + `download` 属性。

### 模块 C：About 页热力图

**决策**：手写 div/SVG 网格（零依赖），GitHub 风格，React island 接收 counts props。

**C1. 数据聚合放 `src/lib/heatmap.ts`**（纯逻辑）
- 导出 `getPostCountsByDate(isAdmin): Promise<Map<string, number>>`（key=`YYYY-MM-DD`，value=当天发文数）
- 内部调 `filterVisiblePosts(isAdmin)`，按 `published` 聚合
- 同时导出 `fillYearGrid(year, counts)`：生成 53 周 × 7 天网格数据（含空白天），供组件渲染

**C2. 新增 `src/components/Heatmap.tsx`**（React island）
- props: `{ yearData: Array<{ date: string; count: number }> }`
- 手写 div 网格（53 列 × 7 行），count 越多颜色越深（4 档：0/1/2/3+，用 `bg-surface` / `bg-primary/30` / `bg-primary/60` / `bg-primary`）
- 月份标签 + 星期标签 + 图例（少→多）
- `client:visible`（首屏不在视口时不 hydrate）
- 响应暗色模式（Tailwind 自动跟随 `.dark`）

**C3. 改 `src/pages/about.astro`**
- 删除占位 div
- frontmatter 调 `getPostCountsByDate(Astro.locals.isAdmin)` + `fillYearGrid`
- 渲染 `<Heatmap client:visible yearData={...} />`，配标题「写作频率」
- 先做当前年，多年切换可后续

### 模块 D：文档与收尾

**D1. 更新 `README.md`**：进度阶段 4 标 ✅；权限模型段补一句搜索/导出/热力图均走 filterVisiblePosts。

**D2. 更新 `docs/next-session-prompt.md`**：阶段 2 的旧内容删掉，更新为阶段 5 的接续提示（完善 docs 与 AGENTS.md）。

---

## 关键约束（必须遵守）

- **搜索索引、导出端点、热力图聚合全部经 `filterVisiblePosts` / `getVisiblePost`**——不允许在调用处自行 if，避免漏判导致私密内容泄露
- **不引入除 MiniSearch 外的依赖**（导出、热力图均零依赖）
- React island 遵循 `ThemeToggle.tsx` 范式（防 hydration mismatch、Tailwind 内联 className）
- `Astro.locals.isAdmin` 是唯一身份来源
- TypeScript strict；纯逻辑在 `src/lib/`，端点在 `src/pages/`
- Header 改动不破坏阶段 3 的登录/登出入口与 admin 徽章
- `.env` / `.vercel/` 不进 git
- commit message 用**中文**，约定式格式（`feat:` / `fix:` / `docs:` / `chore:`）
- 每完成一个模块跑 `pnpm dev` 验证

## 验证（本地，每个模块后跑）

- `pnpm astro check` 通过（strict）
- `pnpm dev`：
  - **搜索**：访客搜「typescript」命中公开文章，搜不到私密日记；管理员能搜到私密内容；空输入无结果
  - **导出**：访客访问 `/posts/private-diary.md` → 404；管理员能下载；下载内容含 frontmatter
  - **热力图**：`/about` 显示热力图，有文章的日期格子着色；访客看不到私密文章的日期计数（私密文章不计入）
  - **Header**：搜索框正常工作，不破坏现有登录/登出入口布局

## 验收标准

- 全站搜索可用：访客搜不到私密内容，管理员能搜到全部
- 单篇文章可导出为 .md 下载，私密文章对访客导出返回 404
- About 页热力图正确渲染，数据走可见性过滤
- 三个功能均不破坏现有权限系统与 Header 布局
- `astro check` 通过，无新警告

## 预期产出文件

- 新增：`src/pages/api/search.json.ts`、`src/components/SearchBox.tsx`、`src/pages/posts/[slug].md.ts`、`src/lib/heatmap.ts`、`src/components/Heatmap.tsx`
- 修改：`src/content/posts/*.md`（补 excerpt）、`src/pages/posts/[slug].astro`（导出按钮）、`src/pages/about.astro`（热力图）、`src/components/Header.astro`（搜索框）、`README.md`、`docs/next-session-prompt.md`
- 新依赖：`minisearch`

## 提交规划（建议拆 4 个 commit）

1. `feat: 新增全站搜索（MiniSearch 客户端 + 索引端点）`
2. `feat: 新增单篇文章导出 Markdown`
3. `feat: About 页新增写作频率热力图`
4. `docs: 更新 README 进度与阶段 5 接续提示`

## 实施顺序建议

先做**模块 A（搜索）**——最有价值、最常用；再做**模块 B（导出）**，简单独立；最后**模块 C（热力图）**，纯展示性。每个模块做完跑一次 dev 验证，最后统一 `astro check`。

## 执行方式

请先用 **EnterPlanMode** 制定阶段 4 详细计划，确认后再实现。重点关注：
1. MiniSearch 的懒加载时序（何时 fetch 索引、何时建 MiniSearch 实例、防抖）
2. 搜索框在 Header 的布局落点（与登录/登出入口、admin 徽章、ThemeToggle 共存）
3. 导出端点重组 frontmatter 的写法（手写 YAML stringify）
4. 热力图网格数据结构（53×7 + 月份对齐 + 跨年边界）
