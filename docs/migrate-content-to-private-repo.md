# 内容源外置到私密仓库 · 待办清单

> 本文件由「外置内容源到独立私密仓库」改动生成，记录后续需要手动完成的操作。
> 改动概述：文章/标签 Markdown 从主仓库 `src/content/` 移到**独立私密 Git 仓库**；
> `predev`/`prebuild` 钩子（`scripts/sync-content.mjs`）会自动 clone/pull 到 `.content-private/`（被 `.gitignore` 忽略）。
> 主仓库可保持公开，clone 出来不含任何文章原文。
>
> 完成后可删除本文件。

---

## 前置确认（先决定，影响最后是否要重写 git 历史）

- [ ] 确认主仓库当前的可见性：**已经 public** / **还是 private**
  - 若**当前是 private**，全部改完并验证后再公开 → 历史里的旧内容只有自己看过，**不用重写历史**。
  - 若**已经 public** 且历史里有敏感内容 → 需要在第 3 步之后重写 git 历史（见文末「可选：抹除历史中的旧内容」）。

---

## 第 1 步：在 GitHub 建私密内容仓库

- [ ] GitHub → New repository，名字随意（如 `blog-content`），**勾选 Private**。
- [ ] 把现有内容文件按 `posts/` + `tags/` 结构推上去。在**主仓库目录**执行（Windows cmd）：

```cmd
:: 1. 建临时目录整理内容仓结构
mkdir %TEMP%\blog-content\posts
mkdir %TEMP%\blog-content\tags
copy src\content\posts\*.md %TEMP%\blog-content\posts\
copy src\content\tags\*.yml %TEMP%\blog-content\tags\

:: 2. 进临时目录初始化并推送（替换成你的私密仓库地址）
cd %TEMP%\blog-content
git init
git add .
git commit -m "init: 迁移博客内容"
git branch -M main
git remote add origin https://github.com/你的名/blog-content.git
git push -u origin main
```

> 推送后**保留**主仓库 `src/content/` 下的文件别删，第 3 步统一处理。

---

## 第 2 步：生成 GitHub Token（fine-grained PAT）

- [ ] GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token。
- [ ] **Resource owner**：自己的账号。
- [ ] **Repository access**：选 **Only select repositories** → 只勾 `blog-content`（**不要**给主仓库权限）。
- [ ] **Permissions** → Repository permissions → **Contents: Read-only**（只读就够了）。
- [ ] 生成后**立即复制 token**（只显示一次），妥善保存。

---

## 第 3 步：从主仓库 git 跟踪移除内容文件

- [ ] 在主仓库目录执行（从 git 移除但**保留本地文件**）：

```cmd
git rm -r --cached src/content/posts src/content/tags
git commit -m "refactor: 内容源外置到私密仓库，移除主仓库内容文件"
```

> 第 1 步已把内容推到私密仓库，这里移除跟踪不会丢内容。
> `src/content/` 目录可留空壳；`src/content.config.ts`（schema 定义）仍在主仓库，不受影响。

---

## 第 4 步：配置本地 `.env`

- [ ] 在主仓库 `.env` 末尾加（替换真实值）：

```bash
CONTENT_REPO_URL=https://github.com/你的名/blog-content.git
CONTENT_REPO_TOKEN=github_pat_xxxxxxxx   :: 第 2 步生成的
```

> 注意 `.env` 文件里用 `=` 赋值即可，不需要 `::` 注释，上面仅作说明。

---

## 第 5 步：本地验证

- [ ] 启动 dev server（先注入环境变量，见 `AGENTS.md` 的 Development 段）：

```bash
set -a; . ./.env; set +a
pnpm dev
```

- [ ] 首次启动看到 `[sync-content] 内容同步完成。` 即 clone 成功（`.content-private/` 目录生成）。
- [ ] 访问站点，确认：
  - [ ] 文章列表/详情正常渲染
  - [ ] 访客视角看不到私密文章（`private-diary`）
  - [ ] 管理员登录后能看到私密文章
  - [ ] 搜索索引、`.md` 导出、热力图正常
- [ ] 删除 `.content-private/` 后重跑 `pnpm dev`，脚本能自动重新 clone。
- [ ] 在私密内容仓库改一篇文章并 push，重跑 `pnpm dev`，确认本地能 pull 到更新。

---

## 第 6 步：Vercel 配置

- [ ] Vercel 项目 → Settings → Environment Variables，加：
  - `CONTENT_REPO_URL` = 私密仓库地址
  - `CONTENT_REPO_TOKEN` = 第 2 步的 PAT
- [ ] Build Command 保持默认（`pnpm build`），`prebuild` 钩子会自动跑。Vercel 构建环境自带 git，clone 可用。
- [ ] 触发一次部署，确认线上文章正常。

---

## 可选：抹除历史中的旧内容（仅当主仓库已 public 且历史含敏感内容时）

> ⚠️ 破坏性操作：会改变所有 commit hash，需要 force push，协作者需重新 clone。

- [ ] 安装 `git-filter-repo`（`pip install git-filter-repo` 或下载单文件脚本）。
- [ ] 在主仓库执行（移除历史中的内容文件）：

```cmd
git filter-repo --path src/content/posts --path src/content/tags --invert-paths
git push --force origin main
```

- [ ] force push 后，Vercel / 任何 clone 过的副本需重新拉取。
- [ ] 完成后再次确认：`git log --all --oneline -- "src/content/posts"` 无输出 = 历史已干净。

---

## 验收清单（全部完成后核对）

- [ ] `git ls-files` 主仓库不再有任何 `.md` 文章 / `.yml` 标签
- [ ] `.content-private/` 不被 git 跟踪
- [ ] 公开 clone 主仓库，看不到任何文章原文
- [ ] 本地 `pnpm dev` / `pnpm build` 均通过
- [ ] Vercel 部署成功，线上渲染正常
- [ ] 访客/管理员可见性符合预期（私密文章访客不可见）
- [ ] （若适用）git 历史已抹除旧内容
