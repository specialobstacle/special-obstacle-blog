/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** 管理员登录密码 */
  readonly ADMIN_PASSWORD: string;
  /** JWT 签名密钥 */
  readonly JWT_SECRET: string;
  /**
   * 私密内容仓库地址（独立 git 仓库）。
   * sync-content.mjs 据此 clone/pull 到 .content-private/。
   * 仅 scripts/ 用，经 Vite define 不打入客户端产物。
   */
  readonly CONTENT_REPO_URL?: string;
  /** 私密内容仓库的 GitHub PAT（fine-grained，Contents: Read）。仅 scripts/ 用。 */
  readonly CONTENT_REPO_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    /** 当前请求是否为管理员视角（由 middleware 注入） */
    isAdmin: boolean;
  }
}
