# docs/ 文档导航

本目录收录项目的**操作性与过程性文档**。项目全貌（技术栈、数据模型、权限模型、命令、环境变量）见根 [`README.md`](../README.md)，此处不重复。

## 文档清单

| 文件 | 用途 | 类型 |
|------|------|------|
| [`vercel-deploy.md`](./vercel-deploy.md) | Vercel 部署、环境变量配置、Node runtime、线上验证清单、故障排查 | 长期文档（运维） |
| [`next-session-prompt.md`](./next-session-prompt.md) | 滚动更新的「新会话接续提示词」，记录项目背景、当前进度与下一阶段目标 | 过程文件 |
| [`archive/stage-3-prompt.md`](./archive/stage-3-prompt.md) | 阶段 3 实施提示词（部署 Vercel + 线上密码门） | 历史提示词（已完成） |
| [`archive/stage-4-prompt.md`](./archive/stage-4-prompt.md) | 阶段 4 实施提示词（全站搜索 / 单篇导出 / About 热力图） | 历史提示词（已完成） |

## 维护约定

- **长期文档**：随代码演进保持同步，引用的路径/命令/变量必须真实有效。
- **过程文件**（`next-session-prompt.md`）：每完成一个阶段，更新进度并移除已落地的阶段块。
- **历史提示词**（`archive/`）：已完成阶段的实施记录，保留作历史参考，不再更新。
