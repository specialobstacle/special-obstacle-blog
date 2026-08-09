## Commit 规范

- commit message 用**中文**，约定式格式：`feat:` / `fix:` / `docs:` / `chore:` / `style:` / `refactor:`
- 一个 commit 只做一件事；文档改动不混入代码改动（发现代码 bug 单独开 commit 修）
- **直接在 `main` 分支上改代码并提交，不要为单个改动新建分支**；用完即弃的临时分支改完即删，保持仓库只有 `main`
- 详见 README「协作约定」段，本文件为其「详见 AGENTS.md」的落脚点

## 可见性硬约束（最容易踩坑）

**所有可见性判断必须经 `src/lib/visibility.ts` 的 `filterVisiblePosts(isAdmin)` / `getVisiblePost(slug, isAdmin)`，不允许在调用处自行 if**，否则私密内容会泄露给访客。

当前已接入过滤的易漏点（改这些文件时务必保持）：

- 列表/详情/分类/标签页：`src/pages/index.astro`、`src/pages/posts/**`、`src/pages/tags/**`
- 搜索索引端点：`src/pages/api/search.json.ts`
- 单篇 Markdown 导出端点：`src/pages/posts/[slug].md.ts`
- About 页热力图聚合：`src/lib/heatmap.ts`（`getPostCountsByDate` 内部调 `filterVisiblePosts`）

新增任何会输出文章内容的页面或端点时，**第一件事**是接上 `filterVisiblePosts` / `getVisiblePost`。

## Development

### Start the dev server（必须先注入环境变量）

> ⚠️ **先读这段，否则 dev server 每个请求都会抛 `JWT_SECRET 环境变量未配置`，页面渲染成 Error 页。**

根因：`src/lib/auth.ts` 读的是 `process.env.JWT_SECRET` / `process.env.ADMIN_PASSWORD`，但 Astro 的 `.env` 经 Vite 加载，**只暴露到 `import.meta.env`，不会注入 Node 的 `process.env`**。`.env` 里虽然有这两个变量，middleware 仍然拿不到。项目未引入 dotenv，所以需要启动前手动把 `.env` 注入 shell 环境。

正确启动方式（Git Bash / POSIX shell）——把 `.env` 的变量 export 后再起 server：

```bash
set -a; . ./.env; set +a
astro dev --background
```

PowerShell 等价写法：

```powershell
Get-Content .env | ForEach-Object { if ($_ -match '^\s*([^#=]+)=(.*)$') { Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2].Trim() } }
astro dev --background
```

> 确认是否注入成功：`[ -n "$JWT_SECRET" ] && echo yes`（应输出 `yes`）。

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.
