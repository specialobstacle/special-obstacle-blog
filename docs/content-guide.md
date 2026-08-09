# 写作指南：创建文章、标签与绑定

本篇讲**操作流程**：怎么一步步新增标签、新增文章、把标签绑到文章上。字段定义与权限模型的完整说明见根 [`README.md`](../README.md) 的「数据模型」「权限模型」，此处不重复 schema，只讲怎么做、有哪些坑。

> 文章/标签 Markdown **不在主仓库**，而在独立的**私密内容仓库**里（结构：`posts/*.md` + `tags/*.yml`）。`pnpm dev` / `pnpm build` 前的钩子会把它 clone 到 `.content-private/`，content collection 从那里读取。本指南里写「`posts/`」「`tags/`」时，指的是私密内容仓库里的对应目录。

> 四条核心规则先记住：
> 1. 标签文件名（去掉 `.yml`）= 标签 **slug**；文章 frontmatter 的 `tags:` 引用的就是这个 slug。
> 2. 文章文件名（去掉 `.md`）= 文章 **slug** = 详情页 URL（`/posts/<文件名>`）。
> 3. 私密文章由 `src/lib/visibility.ts` 统一过滤——绑了 private 标签或写了 `private: true`，访客就完全看不到（列表、URL、搜索、导出、热力图全不出现）。
> 4. **正文不要写一级标题 `#`**——H1 由详情页模板用 frontmatter 的 `title` 自动渲染；正文从二级标题 `##` 起笔。即便误写，渲染时也会被 `src/plugins/strip-h1.ts` 兜底剥离，不会重复显示。

---

## 一、创建标签

在私密内容仓库的 `tags/` 下新建 `.yml` 文件，**文件名即 slug**。

例如新建 `rust.yml`：

```yaml
# tags/rust.yml （私密内容仓库）
name: Rust
description: Rust 语言与系统编程
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✅ | 显示名（如「Rust」「前端」） |
| `description` | 可选 | 简介，标签集合页会用到 |
| `private` | 可选，默认 `false` | 设为 `true` 时，绑定该标签的文章**仅管理员可见**（参考 `private-thoughts.yml`） |

---

## 二、创建文章

在私密内容仓库的 `posts/` 下新建 `.md` 文件，**文件名即 slug，即 URL**。

示例（参考 `posts/typescript-tips.md`）：

```markdown
---
title: Rust 所有权入门
category: article
domain: tech
published: 2026-08-09
excerpt: 理解 Rust 的所有权、借用与生命周期。
tags:
  - rust
  - frontend
---

正文从二级标题起笔，一级标题（H1）由模板自动渲染，不要写 `#`。

## 所有权规则

正文内容……
```

frontmatter 字段速查（schema 在 `src\content.config.ts`，写错枚举值 dev/build 会直接报错）：

| 字段 | 必填 | 取值 |
|------|------|------|
| `title` | ✅ | 任意字符串 |
| `category` | ✅ | `article` / `diary` / `resume` / `page` |
| `domain` | ✅ | `tech` / `life` / `career` / `other`（对应导航 Tech/Life/Career，`other` 为兜底） |
| `published` | ✅ | 日期，如 `2026-08-09`（用于排序与热力图） |
| `tags` | 可选 | 标签 slug 数组，引用私密内容仓库 `tags/` 下的文件名 |
| `excerpt` | 可选 | 摘要，列表页与搜索索引使用 |
| `updated` | 可选 | 最后更新日期 |
| `draft` | 可选，默认 `false` | `true` 时 dev 可见、生产构建排除 |
| `private` | 可选，默认 `false` | `true` 时仅管理员可见 |
| `note` | 可选 | 仅管理员元数据用途，前台不展示 |

---

## 附：正文插图

文章里的图片统一放 `public/images/<文章 slug>/` 下，正文用**以 `/` 开头的绝对路径**引用。

约定目录结构：

```
public/
└── images/
    └── typescript-tips/        ← 与文章同名，便于归属
        ├── screenshot.png
        └── diagram.svg
```

正文里这样写：

```markdown
![类型关系示意图](/images/typescript-tips/diagram.svg)
```

要点：

1. **目录按文章 slug 命名**：一篇一个子目录，避免所有图片堆在一起难以归属。删文章时连同 `public/images/<slug>/` 一起删。
2. **路径必须以 `/` 开头**：`/images/...` 指向 `public/` 根，dev 和生产环境都能直接访问。不要写相对路径（`./images/...` 或 `../...`），它们在 Markdown 导出端点（`src/pages/posts/[slug].md.ts`）里会失效。
3. **尺寸自己控制好**：图片不走 Astro 的优化管线（不压缩、不转 WebP、不生成响应式尺寸），上传前自行压缩到合理体积。`.prose img` 已有 `max-width: 100%` 兜底，宽度不会撑爆正文容器。
4. **远程图片**（图床、对象存储、GitHub raw 等）也可以直接用完整 URL 引用，但会留下对外部服务的依赖，且导出的 Markdown 里会保留这些外链——本仓库默认用本地 `public/images/`。

---

## 三、把标签绑定到文章

在文章 frontmatter 的 `tags:` 下加上**标签的 slug**（即私密内容仓库 `tags/` 下那个 `.yml` 的文件名，不带扩展名）：

```yaml
tags:
  - rust        # 对应 tags/rust.yml
  - frontend    # 对应 tags/frontend.yml
```

> 注意引用的是**文件名（slug）**，不是 `name`（如「前端」）。slug 写错不会报错，但该标签不会在文章页显示。

---

## 四、易踩坑清单

1. **先建标签再建文章**：文章引用的 slug 在 `tags/` 找不到对应文件时不会报错，但标签渲染不出来。新建文章前先确认引用的标签都已存在。

2. **私密文章的两种写法**（可叠加，效果相同）：
   - 文章 frontmatter 直接写 `private: true`；
   - 或绑定一个 `private: true` 的标签（如 `private-thoughts`）。
   
   两者都会被 `filterVisiblePosts` 对访客隐藏——**不出现在列表、URL 直接访问 404、搜索命不中、不可导出、不计入热力图**。

3. **草稿的双面性**：`draft: true` 在 `astro dev` 下对所有人可见（方便预览），生产构建默认排除。线上不想公开的文章用 `draft` 或 `private`，别只靠「还没发布」的惯性思维。

4. **slug 命名**：用小写、连字符分隔（`typescript-tips`、`private-thoughts`），避免空格和中文——它会出现在 URL、搜索索引、导出文件名里。

5. **schema 强校验**：`category` / `domain` 写错枚举值、必填字段缺失、日期格式不对，都会在 dev/build 时报错。改对即可，不需要手动维护索引。

6. **正文不写一级标题**：详情页的 H1 已由 frontmatter 的 `title` 渲染在标题区。正文若再写 `#`，标题会重复显示两次。正文一律从 `##` 起笔；即便误写 `#`，`src/plugins/strip-h1.ts` 会在渲染时剥离兜底，但请保持源文件干净、直接不写。

---

## 五、发布流程

1. 在私密内容仓库的 `tags/` 准备好需要的标签（若已存在可跳过）。
2. 在私密内容仓库的 `posts/` 新建 `.md` 文件，填好 frontmatter 和正文，**提交并 push 到私密内容仓库**。
3. 启动 dev server 预览（注意先注入环境变量，见 `AGENTS.md` 的 Development 段）：
   ```bash
   set -a; . ./.env; set +a
   astro dev --background
   ```
   首次启动会自动 clone 私密内容仓库到 `.content-private/`；后续每次 `pnpm dev` 会自动 pull 最新内容。
4. 访问 `/posts/<slug>` 确认渲染、标签、可见性符合预期。
5. 内容改动提交到**私密内容仓库**（那里是内容源）。主仓库只在改代码/schema/配置时才提交。
