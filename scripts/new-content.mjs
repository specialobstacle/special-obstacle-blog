// @ts-check
/**
 * 新建文章 / 知识卡片的脚手架 —— `pnpm new <slug>`。
 *
 * 做的事：
 *   1. 读 .env（存在时）注入 CONTENT_REPO_URL / CONTENT_REPO_TOKEN 到 process.env
 *   2. 复用 predev 钩子把内容仓库同步到 ./.content-private/
 *   3. 在 posts/（或 --card 时 cards/）下生成带合法 frontmatter 的模板文件
 *   4. 打印「编辑后提交推送」的现成命令
 *
 * 只生成文件，不自动 commit/push —— 写作内容由作者掌控，推送命令给出即可复制执行。
 *
 * 用法：
 *   pnpm new my-post-slug                # 新建文章 posts/my-post-slug.md
 *   pnpm new my-post-slug --category diary --domain life --title "标题"
 *   pnpm new my-card-slug --card         # 新建知识卡片 cards/my-card-slug.md
 *
 * slug 即 URL（/posts/<slug> 或卡片弹窗），只允许小写字母、数字和中划线。
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_FILE = resolve(ROOT, '.env');
const CONTENT_DIR = resolve(ROOT, '.content-private');

/** .env 只在这一个脚本里手动解析（pnpm new 不经过 Vite，也不会有人先 export） */
function loadDotEnv() {
  if (!existsSync(ENV_FILE)) return;
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}

function usageExit(code = 1) {
  console.log(
    '\n用法：pnpm new <slug> [选项]\n' +
      '  --category <article|diary|resume|page>   文章类别，默认 article\n' +
      '  --domain <tech|life|career|other>        领域，默认 tech\n' +
      '  --title <标题>                            文章/卡片标题，默认用 slug\n' +
      '  --tags <a,b>                              绑定标签 slug（需已存在于 tags/）\n' +
      '  --card                                    新建知识卡片而非文章\n',
  );
  process.exit(code);
}

function parseArgs(argv) {
  const opts = { kind: 'post', category: 'article', domain: 'tech', tags: [] };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--card') opts.kind = 'card';
    else if (a === '--category' || a === '--domain' || a === '--title') {
      const v = argv[++i];
      if (!v) { console.error(`[new-content] ${a} 缺少参数值`); usageExit(); }
      opts[a.slice(2)] = v;
    } else if (a === '--tags') {
      const v = argv[++i];
      if (!v) { console.error('[new-content] --tags 缺少参数值'); usageExit(); }
      opts.tags = v.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--help' || a === '-h') usageExit(0);
    else if (a.startsWith('--')) { console.error(`[new-content] 未知选项 ${a}`); usageExit(); }
    else positional.push(a);
  }
  if (positional.length !== 1) {
    console.error('[new-content] 需要恰好一个 slug 参数。');
    usageExit();
  }
  opts.slug = positional[0];
  return opts;
}

function validate(opts) {
  const { CATEGORIES, DOMAINS } = getEnums();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(opts.slug)) {
    console.error(`[new-content] slug 只允许小写字母、数字、中划线，收到 "${opts.slug}"`);
    process.exit(1);
  }
  if (opts.kind === 'card') return; // 卡片只有 domain
  if (!CATEGORIES.includes(opts.category)) {
    console.error(`[new-content] category 必须是 ${CATEGORIES.join(' | ')}，收到 "${opts.category}"`);
    process.exit(1);
  }
  if (!DOMAINS.includes(opts.domain)) {
    console.error(`[new-content] domain 必须是 ${DOMAINS.join(' | ')}，收到 "${opts.domain}"`);
    process.exit(1);
  }
}

/** 枚举值与 src/lib/constants.ts 保持同步（复制而非 import，避免依赖 TS 加载器） */
function getEnums() {
  const src = readFileSync(resolve(ROOT, 'src/lib/constants.ts'), 'utf8');
  const grab = (name) => {
    const m = src.match(new RegExp(`${name}\\s*=\\s*\\[([^\\]]+)\\]`));
    if (!m) throw new Error(`constants.ts 里找不到 ${name}`);
    return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
  };
  return { CATEGORIES: grab('CATEGORIES'), DOMAINS: grab('DOMAINS') };
}

function ensureContentRepo() {
  // sync-content.mjs 会 clone/pull 到 .content-private/，缺 CONTENT_REPO_URL 时自行报错退出
  execSync('node scripts/sync-content.mjs', { cwd: ROOT, stdio: 'inherit' });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function buildFrontmatter(opts) {
  const lines = [
    `title: ${JSON.stringify(opts.title || opts.slug)}`,
  ];
  if (opts.kind === 'post') lines.push(`category: ${opts.category}`);
  lines.push(`domain: ${opts.domain}`, `published: ${today()}`);
  if (opts.tags.length) lines.push(`tags: [${opts.tags.join(', ')}]`);
  lines.push('draft: true');
  return lines.join('\n');
}

function main() {
  loadDotEnv();
  const opts = parseArgs(process.argv.slice(2));
  validate(opts);
  ensureContentRepo();

  const subDir = opts.kind === 'card' ? 'cards' : 'posts';
  const filePath = resolve(CONTENT_DIR, subDir, `${opts.slug}.md`);
  if (existsSync(filePath)) {
    console.error(`[new-content] 已存在 ${filePath}，不覆盖。换个 slug 或直接编辑现有文件。`);
    process.exit(1);
  }

  const body =
    opts.kind === 'card'
      ? '\n一段简短的知识点解释（卡片弹窗内直接渲染正文）。\n'
      : '\n<!-- 正文从 ## 二级标题起笔，不写 # 一级标题（页面 H1 由模板渲染） -->\n\n## 开头\n';
  writeFileSync(filePath, `---\n${buildFrontmatter(opts)}\n---\n${body}`);

  console.log(`\n[new-content] 已生成 ${filePath}`);
  console.log(
    '\n接下来：\n' +
      '  1. 编辑上面的文件（写完后可把 draft: true 删掉或改 false）\n' +
      '  2. 提交并推送到内容仓库：\n' +
      `       git -C .content-private add ${subDir}/${opts.slug}.md\n` +
      `       git -C .content-private commit -m "content: 新增${opts.kind === 'card' ? '卡片' : '文章'} ${opts.slug}"\n` +
      '       git -C .content-private push\n' +
      '  3. 本地预览：pnpm dev（predev 会自动拉取最新内容）\n' +
      '  4. 线上生效：push 主仓库任意提交，或在 Vercel 点 Redeploy\n',
  );
}

main();
