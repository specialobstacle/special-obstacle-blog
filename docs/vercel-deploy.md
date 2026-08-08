# Vercel 部署指引（阶段 3）

本文档面向**部署操作者**：把本仓库部署到 Vercel、配置环境变量、确认 Node runtime，并在上线后按清单验证「访客看不到私密内容、管理员登录后可见」。

> 鉴权代码（`/login`、`/logout`、速率限制、CSRF、Header 入口）已在仓库内就绪，本文档只覆盖 **Vercel 平台操作 + 线上验证**。

---

## 0. 前置确认

- 仓库已推送至 GitHub/GitLab/Bitbucket，Vercel 可访问。
- 本地 `pnpm build` 能通过（`pnpm install && pnpm build`）。
- 准备好两个密钥（见第 2 步）：一个强管理员密码、一个 64 位 hex 的 `JWT_SECRET`。

---

## 1. 导入项目

1. 登录 [Vercel Dashboard](https://vercel.com/) → **Add New… → Project**。
2. 选择本仓库 → Import。
3. Vercel 自动识别为 Astro 项目（`@astrojs/vercel` 已装），**Build/Output 保持默认**：
   - Build Command：`astro build`（或留空，自动检测）
   - Output Directory：`dist`
   - Install Command：`pnpm install`（Vercel 会按 `package.json` 的 `pnpm` 自动选）
4. 暂不点 Deploy——先去配环境变量（下一步），避免首次构建因缺 `JWT_SECRET` 报错。

---

## 2. 配置环境变量

在 Vercel 项目的 **Settings → Environment Variables** 添加（**Production 与 Preview 都加**；Development 按需）：

| Key | Value | 说明 |
|-----|-------|------|
| `ADMIN_PASSWORD` | `<你的强密码>` | 管理员登录密码，建议 16 位以上混合字符 |
| `JWT_SECRET` | `<64 位 hex>` | 用下面命令生成 |

生成 `JWT_SECRET`：

```bash
openssl rand -hex 32
# 或
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

⚠️ **绝不要**把这两个值写进仓库（`.env`、`astro.config.mjs`、任何文件）。`.gitignore` 已忽略 `.env` 与 `.vercel/`，不要改坏。

配好后回到 Deployments → 对最新 commit 点 **Redeploy**（或推一个新 commit 触发部署）。

---

## 3. 确认 Node 22 runtime

`package.json` 已声明 `"engines": { "node": ">=22.12.0" }`，Vercel 默认读取该字段选用 Node 22。

**验证方法**：部署成功后，进入 Vercel 项目 → **Settings → General → Node.js Version**，应显示 22.x。

**若未生效**（仍是 20.x），在仓库根新增 `vercel.json` 显式指定：

```json
{
  "functions": {
    "src/**/*.js": { "memory": 1024 }
  }
}
```

> 注：Node 版本由 Vercel 项目的 `Node.js Version` 设置控制，`engines.node` 是推荐触发方式。如遇问题优先在 Settings 里把 Node Version 改为 22.x，再考虑 `vercel.json`。

---

## 4. 设置真实域名后改 `site`

拿到 Vercel 分配的域名（如 `https://your-blog.vercel.app` 或自定义域名）后：

1. 编辑 `astro.config.mjs`，把 `site: 'https://example.com'` 改为真实域名。
2. 提交并推送，触发重新部署。

`site` 影响 sitemap 与 canonical URL，必须在拿到域名后改对。本仓库当前用占位值 `example.com`。

---

## 5. 线上验证清单

部署成功后，**先以访客身份**（用无痕窗口，确保没有 admin cookie）逐一确认：

### 访客（未登录）

- [ ] 首页 `/`、`/posts`、四个分类页（`/posts/tech` 等）、`/tags`、公开标签详情页（如 `/tags/typescript`）、`/about`、`/resume` 全部返回 200
- [ ] `/posts/private-diary` → 跳转 404（不暴露私密文章存在性）
- [ ] `/tags/private-thoughts` → 跳转 404（不暴露私密标签存在性）
- [ ] `/tags` 列表里**看不到**「私密随想」标签卡片
- [ ] `/posts` 列表里**看不到**草稿 `draft-wip`（生产环境草稿对访客隐藏；本地 dev 可见是正常的）
- [ ] Header 右上角显示「登录」按钮（无 admin 徽章、无「登出」）
- [ ] `/login` 表单可见；输错密码 → 统一提示「密码或验证失败，请重试」（不暴露具体原因）
- [ ] 连续输错 5 次（10 分钟窗口内）→ 提示「尝试次数过多，请稍后再试」，锁定约 10 分钟

### 管理员（登录后）

- [ ] `/login` 输入正确 `ADMIN_PASSWORD` → 跳回首页，Header 出现 `admin` 徽章 + 「登出」按钮
- [ ] `/posts/private-diary` 能访问，看到「私密」徽章
- [ ] `/tags` 能看到「私密随想」标签卡片（带「私密」徽章）
- [ ] `/posts/draft-wip`（草稿）可见
- [ ] 点 Header「登出」→ 回到首页，恢复访客态（admin 徽章消失、显示「登录」）
- [ ] 登出后再访问 `/posts/private-diary` → 又跳 404

---

## 6. 故障排查

| 现象 | 可能原因 |
|------|----------|
| 部署时构建报 `JWT_SECRET 环境变量未配置` | 环境变量未加 / 未对 Production 生效；回到 Settings 核对 |
| 登录提示「密码或验证失败」但密码没错 | `ADMIN_PASSWORD` 环境变量值不对，或有多余空格/引号 |
| 登录成功但刷新后又不识别 | cookie 未写成功——检查浏览器是否禁用 cookie；或 `secure: true` 在 http 域名下失效（Vercel 默认 https，正常） |
| `/login` POST 返回 403 | CSRF 同源校验拦截——浏览器正常提交不应触发；若用工具测试（无 `Origin`/`Sec-Fetch-Site`）属预期 |
| 速率限制似乎没生效 | 内存计数仅对**同一 Serverless 实例**生效，多实例下会分散；本阶段可接受，如需更强见 `src/lib/rateLimit.ts` 注释 |

---

## 7. 安全说明

- **cookie**：`httpOnly: true`（防 XSS 读）、`secure: true`（生产仅 https）、`sameSite: 'lax'`（防多数 CSRF）、`path: '/'`、TTL 30 天。
- **token**：HMAC-SHA256 签名，校验用 `timingSafeEqual` 防时序攻击（见 `src/lib/auth.ts`）。
- **速率限制**：5 次/10 分钟失败 → 锁 10 分钟（内存实现，见 `src/lib/rateLimit.ts`）。
- **CSRF**：同源校验（`Sec-Fetch-Site` + `Origin`/`Host` 回退，见 `src/lib/csrf.ts`）。
- **私密内容**：登录页是入口，`src/lib/visibility.ts` 的 `filterVisiblePosts(isAdmin)` 是出口，两层独立——即便登录逻辑出错，可见性系统仍兜底。
