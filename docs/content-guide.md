# 写作指南：创建文章、标签与绑定

本篇讲**操作流程**：怎么一步步新增标签、新增文章、把标签绑到文章上。字段定义与权限模型的完整说明见根 [`README.md`](../README.md) 的「数据模型」「权限模型」，此处不重复 schema，只讲怎么做、有哪些坑。

> 三条核心规则先记住：
> 1. 标签文件名（去掉 `.yml`）= 标签 **slug**；文章 frontmatter 的 `tags:` 引用的就是这个 slug。
> 2. 文章文件名（去掉 `.md`）= 文章 **slug** = 详情页 URL（`/posts/<文件名>`）。
> 3. 私密文章由 `src/lib/visibility.ts` 统一过滤——绑了 private 标签或写了 `private: true`，访客就完全看不到（列表、URL、搜索、导出、热力图全不出现）。

---

## 一、创建标签

在 `src/content/tags/` 下新建 `.yml` 文件，**文件名即 slug**。

例如新建 `rust.yml`：

```yaml
# src/content/tags/rust.yml
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

在 `src/content/posts/` 下新建 `.md` 文件，**文件名即 slug，即 URL**。

示例（参考 `src/content/posts/typescript-tips.md`）：

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

# Rust 所有权入门

正文内容……
```

frontmatter 字段速查（schema 在 `src\content.config.ts`，写错枚举值 dev/build 会直接报错）：

| 字段 | 必填 | 取值 |
|------|------|------|
| `title` | ✅ | 任意字符串 |
| `category` | ✅ | `article` / `diary` / `resume` / `page` |
| `domain` | ✅ | `tech` / `life` / `career` / `other`（对应导航 Tech/Life/Career，`other` 为兜底） |
| `published` | ✅ | 日期，如 `2026-08-09`（用于排序与热力图） |
| `tags` | 可选 | 标签 slug 数组，引用 `src/content/tags/` 下的文件名 |
| `excerpt` | 可选 | 摘要，列表页与搜索索引使用 |
| `updated` | 可选 | 最后更新日期 |
| `draft` | 可选，默认 `false` | `true` 时 dev 可见、生产构建排除 |
| `private` | 可选，默认 `false` | `true` 时仅管理员可见 |
| `note` | 可选 | 仅管理员元数据用途，前台不展示 |

---

## 三、把标签绑定到文章

在文章 frontmatter 的 `tags:` 下加上**标签的 slug**（即 `src/content/tags/` 下那个 `.yml` 的文件名，不带扩展名）：

```yaml
tags:
  - rust        # 对应 src/content/tags/rust.yml
  - frontend    # 对应 src/content/tags/frontend.yml
```

> 注意引用的是**文件名（slug）**，不是 `name`（如「前端」）。slug 写错不会报错，但该标签不会在文章页显示。

---

## 四、易踩坑清单

1. **先建标签再建文章**：文章引用的 slug 在 `src/content/tags/` 找不到对应文件时不会报错，但标签渲染不出来。新建文章前先确认引用的标签都已存在。

2. **私密文章的两种写法**（可叠加，效果相同）：
   - 文章 frontmatter 直接写 `private: true`；
   - 或绑定一个 `private: true` 的标签（如 `private-thoughts`）。
   
   两者都会被 `filterVisiblePosts` 对访客隐藏——**不出现在列表、URL 直接访问 404、搜索命不中、不可导出、不计入热力图**。

3. **草稿的双面性**：`draft: true` 在 `astro dev` 下对所有人可见（方便预览），生产构建默认排除。线上不想公开的文章用 `draft` 或 `private`，别只靠「还没发布」的惯性思维。

4. **slug 命名**：用小写、连字符分隔（`typescript-tips`、`private-thoughts`），避免空格和中文——它会出现在 URL、搜索索引、导出文件名里。

5. **schema 强校验**：`category` / `domain` 写错枚举值、必填字段缺失、日期格式不对，都会在 dev/build 时报错。改对即可，不需要手动维护索引。

---

## 五、发布流程

1. 在 `src/content/tags/` 准备好需要的标签（若已存在可跳过）。
2. 在 `src/content/posts/` 新建 `.md` 文件，填好 frontmatter 和正文。
3. 启动 dev server 预览（注意先注入环境变量，见 `AGENTS.md` 的 Development 段）：
   ```bash
   set -a; . ./.env; set +a
   astro dev --background
   ```
4. 访问 `/posts/<slug>` 确认渲染、标签、可见性符合预期。
5. 提交：`git add` + 中文约定式 commit（如 `docs: 新增 Rust 所有权入门` 或 `feat(post): ...`）。
