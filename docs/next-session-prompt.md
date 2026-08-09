# 新会话接续提示词

> 用法：开新对话时，直接说「读 `docs/next-session-prompt.md` 并执行」即可。
> 本文件会随项目推进更新（每完成一个阶段，把对应块移除）。

---

## 项目背景（一句话）

Astro v7 SSR + React + Tailwind v4 + Vercel adapter 的个人博客，Git-based 内容存储（文章是 `src/content/posts/*.md`，标签是 `src/content/tags/*.yml`），单管理员密码鉴权（middleware 注入 `Astro.locals.isAdmin`），私密标签绑定的文章对访客完全隐藏。**阶段 1-4 均已完成**：可见性系统、分类/标签/About/Resume 页、登录/登出 + 速率限制 + CSRF + Vercel 部署、全站搜索（MiniSearch）、单篇导出 Markdown、About 页写作频率热力图。线上域名：`https://special-obstacle-blog.vercel.app`。

## 当前进度

- 最新 commit：见 `git log --oneline -1`
- ✅ 阶段 1（MVP）：脚手架、数据模型、可见性系统、鉴权基建、首页/列表/详情、暗色模式
- ✅ 阶段 2：分类页 / 标签集合页 / 标签详情页 / About / Resume / 404
- ✅ 阶段 3：`/login`、`/logout`、速率限制、CSRF、Vercel 部署、线上验证通过
- ✅ 阶段 4：全站搜索（MiniSearch）、单篇导出 Markdown、About 页写作频率热力图
- ⏳ **本次任务：阶段 5**

## 开始前必读

请先读这几个文件再制定计划：

- `README.md`（项目全貌、权限模型、环境变量）
- `AGENTS.md`（协作约定，尤其 dev server 用 background 模式）
- `src/lib/visibility.ts`（权限核心，**所有列表/详情/搜索/导出/热力图必须经 `filterVisiblePosts(isAdmin)`**）
- `src/lib/heatmap.ts`（阶段 4 新增：热力图聚合纯逻辑，可见性范式）
- `docs/` 目录现有文档（见 [`docs/README.md`](./README.md) 导航：`vercel-deploy.md`、`archive/stage-3-prompt.md`、`archive/stage-4-prompt.md`）

## 阶段 5 目标

完善 `docs/` 与 `AGENTS.md`，把项目从「能跑」推进到「可移交、可维护」。这是收尾性的文档阶段，**不写新功能代码**。

1. **盘点 `docs/`**：现有文件（vercel-deploy / stage-3 / stage-4 提示词、next-session-prompt）角色是否清晰？哪些该保留为历史、哪些该升级为「长期文档」？建议产出一份 `docs/README.md`（或 `docs/INDEX.md`）作为文档导航。
2. **补关键文档**（按实际缺失情况选择，不必全做）：
   - **架构概览**（数据流：content collection → visibility filter → page/endpoint；React island 范式；权限模型的单一事实源）
   - **内容维护手册**（如何加文章/标签、frontmatter 字段速查、私密标签用法、草稿 vs 私密的区别）
   - **运维手册**（环境变量、Vercel 部署回滚、本地用 `.env` 启动 dev server 的正确方式、`astro dev --background` 命令组）
3. **精简 `AGENTS.md`**：把重复 README 的内容删掉，聚焦「AI 协作约定」该独有的部分（commit 规范、dev server 命令、必读文件清单、可见性系统的硬约束）。避免与 README / docs 互相漂移。
4. **清理历史提示词**：`stage-3-prompt.md`、`stage-4-prompt.md` 已完成，决定是否归档到 `docs/archive/` 或保留作历史参考。

## 关键约束（必须遵守）

- **本阶段是文档，不引入代码改动**（如发现代码 bug，单独开 commit 修，不混进文档 commit）
- 文档与代码现状必须一致：引用的文件路径、函数名、命令、环境变量都要核对真实存在
- 不要复制粘贴 README 已有内容到 docs，做「增量 + 交叉引用」
- commit message 用**中文**，约定式格式（`docs:` / `chore:`）
- 不破坏现有 `.env` / `.vercel/` 的 gitignore 状态

## 验收标准

- `docs/` 有清晰入口（导航文件或 README 段落指明各文档用途）
- `AGENTS.md` 无与 README 重复的冗余，聚焦协作约定
- 所有文档引用的路径/命令/变量经核对真实有效
- `astro check` 仍 0 errors（文档改动不应影响类型检查，但跑一次兜底）

## 执行方式

请先用 **EnterPlanMode** 制定阶段 5 详细计划（先盘点 docs 与 AGENTS.md 现状，列出要新增/精简/归档的具体文件与改动），确认后再实现。
