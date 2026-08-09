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

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
