---
title: 一篇私密日记（测试用）
category: diary
domain: life
published: 2026-08-06
excerpt: 这篇文章通过绑定 private 标签被标记为私密，访客不应看到。
tags:
  - private-thoughts
private: true
---

# 一篇私密日记（测试用）

这篇文章绑定了 `private-thoughts` 标签（该标签 private=true），
因此对访客完全不可见——不出现在列表、不可访问 URL、不被搜索命中。

只有管理员在线上用密码登录后才能查看。

## 验证清单

- [ ] 访客在 `/posts` 看不到这篇
- [ ] 访客直接访问 `/posts/private-diary` 返回 404
- [ ] 访客搜索"私密" 命中 0 条
- [ ] 管理员登录后能在列表看到、能访问详情
