// @ts-check
/**
 * 同步私密内容仓库 —— predev/prebuild 钩子调用。
 *
 * 把独立的私密内容仓库 clone（或 pull）到 ./.content-private/，
 * 供 Astro content collection（content.config.ts）读取。
 *
 * 设计原则：
 *   - 拉不到内容就硬失败（exit 非 0），绝不允许「空站静默上线」。
 *   - token 走环境变量 CONTENT_REPO_TOKEN，绝不写进代码或日志。
 *   - 本地无 token 时，回退到 CONTENT_REPO_URL 原样使用（SSH / 已配置好凭据的场景）。
 *
 * 环境变量：
 *   CONTENT_REPO_URL    必填。私密内容仓库地址，如 https://github.com/owner/repo.git
 *   CONTENT_REPO_TOKEN  可选。GitHub PAT（fine-grained，建议仅 Contents: Read）。
 *                       存在时拼成 https://x-access-token:<TOKEN>@github.com/... 形式。
 */

import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET_DIR = resolve('./.content-private');

function buildRepoUrl() {
  const base = process.env.CONTENT_REPO_URL?.trim();
  if (!base) {
    console.error(
      '\n[sync-content] 缺少环境变量 CONTENT_REPO_URL。\n' +
        '请在 .env（本地）或 Vercel 项目的环境变量中配置私密内容仓库地址，\n' +
        '例如 CONTENT_REPO_URL=https://github.com/owner/repo.git\n',
    );
    process.exit(1);
  }

  const token = process.env.CONTENT_REPO_TOKEN?.trim();
  if (!token) {
    // 无 token：原样使用 URL（依赖本机已配置的 SSH key / git credential）
    return base;
  }

  // 有 token：注入到 https URL。仅对 https 生效；SSH URL（git@github.com:...）忽略 token
  if (base.startsWith('https://') || base.startsWith('http://')) {
    const scheme = base.startsWith('https') ? 'https' : 'http';
    const rest = base.slice(scheme.length + 3); // 去掉 "https://"
    return `${scheme}://x-access-token:${token}@${rest}`;
  }

  console.warn(
    '[sync-content] CONTENT_REPO_TOKEN 已设置但 URL 非 https，token 将被忽略（按原 URL 访问）。',
  );
  return base;
}

/**
 * 执行 git 子命令。
 *
 * @param {string} args - git 子命令参数（如 `-C "dir" pull --ff-only`）
 * @param {Partial<import('node:child_process').ExecSyncOptions> & { silent?: boolean }} [opts]
 *   silent: 自定义标志——为 true 时 stdout/stderr 静默（clone/pull 含 token，
 *   避免 token 进日志）；其余字段透传给 execSync（stdio 由本函数按 silent 决定，
 *   调用方不应再传 stdio）
 */
function runGit(args, opts = {}) {
  execSync(`git ${args}`, { stdio: opts.silent ? ['ignore', 'ignore', 'inherit'] : 'inherit', ...opts });
}

function ensureGitAvailable() {
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    console.error('\n[sync-content] 未找到 git，请先安装 git 并加入 PATH。\n');
    process.exit(1);
  }
}

function sync() {
  ensureGitAvailable();
  const repoUrl = buildRepoUrl();

  if (existsSync(TARGET_DIR)) {
    // 已存在：尝试 pull 更新。目录若损坏（非 git 仓库）则重建。
    const gitDir = resolve(TARGET_DIR, '.git');
    if (!existsSync(gitDir)) {
      console.warn(`[sync-content] ${TARGET_DIR} 存在但不是 git 仓库，重建中...`);
      rmSync(TARGET_DIR, { recursive: true, force: true });
    } else {
      console.log(`[sync-content] 更新 ${TARGET_DIR} ...`);
      try {
        // remote url 可能已变（token 轮换），先 seturl 再 pull
        execSync(`git -C "${TARGET_DIR}" remote set-url origin "${repoUrl}"`, {
          stdio: 'ignore',
        });
        runGit(`-C "${TARGET_DIR}" pull --ff-only`, { silent: true });
        console.log('[sync-content] 内容已更新。');
        return;
      } catch {
        console.warn(
          '[sync-content] pull 失败，删除后重新 clone...',
        );
        rmSync(TARGET_DIR, { recursive: true, force: true });
      }
    }
  }

  console.log(`[sync-content] clone 私密内容仓库到 ${TARGET_DIR} ...`);
  try {
    // --depth 1 只取最新快照，无需历史（内容历史在私密仓库本身保留）
    runGit(`clone --depth 1 "${repoUrl}" "${TARGET_DIR}"`, { silent: true });
  } catch {
    console.error(
      '\n[sync-content] clone 失败。请检查：\n' +
        '  1. CONTENT_REPO_URL 是否正确\n' +
        '  2. CONTENT_REPO_TOKEN 是否有效且对私密仓库有 Contents: Read 权限\n' +
        '  3. 网络是否能访问 github.com\n',
    );
    // 清理半成品，避免下次误判为「已 clone」
    if (existsSync(TARGET_DIR)) rmSync(TARGET_DIR, { recursive: true, force: true });
    process.exit(1);
  }

  // 校验内容结构
  const postsDir = resolve(TARGET_DIR, 'posts');
  const tagsDir = resolve(TARGET_DIR, 'tags');
  if (!existsSync(postsDir) && !existsSync(tagsDir)) {
    console.error(
      `\n[sync-content] clone 成功但 ${TARGET_DIR} 下既无 posts/ 也无 tags/。\n` +
        '私密内容仓库结构应为：\n' +
        '  posts/*.md\n' +
        '  tags/*.yml\n',
    );
    process.exit(1);
  }

  console.log('[sync-content] 内容同步完成。');
}

sync();
