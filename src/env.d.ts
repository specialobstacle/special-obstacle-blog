/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** 管理员登录密码 */
  readonly ADMIN_PASSWORD: string;
  /** JWT 签名密钥 */
  readonly JWT_SECRET: string;
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
