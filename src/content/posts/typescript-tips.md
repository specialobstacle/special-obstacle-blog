---
title: TypeScript 类型体操入门
category: article
domain: tech
published: 2026-08-07
excerpt: 几个常用且实用的 TypeScript 类型技巧，从条件类型到模板字面量。
tags:
  - typescript
  - frontend
---

记录几个日常开发中真正用得上的类型技巧。

## 条件类型

条件类型让你可以在类型层面做判断：

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>; // false
```

## 映射类型

把一个对象类型的所有键做变换：

```ts
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};
```

## 模板字面量类型

字符串层面的类型操作，适合做 API 路径或事件名：

```ts
type EventName = `on${Capitalize<string>}`;
```

## 实战建议

类型体操不是越复杂越好。能简单就别炫技，可读性比聪明更重要。

- 优先用工具类型组合
- 复杂的类型加注释
- 给团队留 docs
