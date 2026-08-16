# 新会话接续提示词

> 用法：开新对话时，直接说「读 `docs/next-session-prompt.md` 并执行」即可。
> 本文件会随项目推进更新（每完成一个阶段，把对应块移除）。

---

## 项目背景（一句话）

Astro v7 SSR + React + Tailwind v4 + Vercel adapter 的个人博客，Git-based 内容存储（文章/标签/卡片 Markdown 在**独立私密内容仓库**，由 `predev`/`prebuild` 钩子 clone 到 `.content-private/`），单管理员密码鉴权（middleware 注入 `Astro.locals.isAdmin`），私密标签绑定的文章/卡片对访客完全隐藏。**阶段 1-6 均已完成**：可见性系统、分类/标签/About/Resume 页、登录/登出 + 速率限制 + CSRF + Vercel 部署、全站搜索（MiniSearch）、单篇导出 Markdown、About 页写作频率热力图、知识卡片弹窗轮播（类 Zettelkasten）。线上域名：`https://www.speobs.com`（裸域 `speobs.com` 308 重定向到 www；原 `special-obstacle-blog.vercel.app` 仍由 Vercel 提供）。

## 当前进度

- 最新 commit：见 `git log --oneline -1`
- ✅ 阶段 1（MVP）：脚手架、数据模型、可见性系统、鉴权基建、首页/列表/详情、暗色模式
- ✅ 阶段 2：分类页 / 标签集合页 / 标签详情页 / About / Resume / 404
- ✅ 阶段 3：`/login`、`/logout`、速率限制、CSRF、Vercel 部署、线上验证通过
- ✅ 阶段 4：全站搜索（MiniSearch）、单篇导出 Markdown、About 页写作频率热力图
- ✅ 阶段 5：完善 `docs/`（导航索引 + 归档历史提示词）、精简 `AGENTS.md`、修正 README 与代码不符之处
- ✅ 阶段 6：知识卡片（`cards` collection + `filterVisibleCards*` 出口 + `CardCarousel` 组件，接入首页 / 四领域分类页 / 文章列表页 / 标签详情页）

> 当前无进行中的阶段性任务。新工作通常是：写新文章/标签/卡片（去私密内容仓库）、改前台样式/交互、修 bug。开新会话时，请先读下面的必读文件，再按用户具体诉求制定计划。

## 开始前必读

请先读这几个文件再制定计划：

- `README.md`（项目全貌、数据模型、权限模型、环境变量、开发进度）
- `AGENTS.md`（协作约定：commit 规范、可见性硬约束、dev server 启动方式）
- `src/lib/visibility.ts`（权限核心，**所有列表/详情/搜索/导出/热力图/卡片轮播必须经 `filterVisiblePosts` / `filterVisibleCards*`**）
- `src/content.config.ts`（三个 collection 的 schema：posts / tags / cards）
- `docs/` 目录现有文档（见 [`docs/README.md`](./README.md) 导航）

## 关键约束（必须遵守）

- **可见性判断必须经 `src/lib/visibility.ts`**，不允许在调用处自行 if——否则私密内容会泄露给访客。新增任何会输出文章/卡片内容的页面或端点时，**第一件事**是接上对应的 `filterVisible*` 函数。
- **内容（文章/标签/卡片）不在主仓库**，而在独立私密内容仓库。改 schema 在主仓库的 `content.config.ts`；写/改内容去私密内容仓库。
- 文档与代码现状必须一致：引用的文件路径、函数名、命令、环境变量都要核对真实存在。
- commit message 用**中文**，约定式格式（`feat:` / `fix:` / `docs:` / `chore:` / `style:` / `refactor:`）。一个 commit 只做一件事；文档改动不混入代码改动（发现代码 bug 单独开 commit 修）。
- **直接在 `main` 分支改代码并提交**，不要为单个改动新建分支；用完即弃的临时分支改完即删。

## 执行方式

收到具体任务后，请先用 **EnterPlanMode** 制定计划（盘点现状、列出要改的文件与改动），确认后再实现。纯研究性任务（读代码、回答问题、查文档）不需要进 plan mode。
