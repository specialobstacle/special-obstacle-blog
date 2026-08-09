import { useEffect, useMemo, useRef, useState } from 'react';
import MiniSearch, { type SearchResult } from 'minisearch';

import { DOMAIN_LABELS, type Domain } from '../lib/constants';

/**
 * Header 搜索框（React island）。
 *
 * 懒加载时序（避免首屏加载全部文章数据）：
 *   1. 初始只渲染一个 🔍 图标按钮，不 fetch 任何东西
 *   2. 点击展开 → 此时才 fetch /api/search.json 并建 MiniSearch 索引
 *   3. 输入 → 防抖 150ms → 查询 → 下拉渲染（标题高亮 + excerpt 片段 + 领域徽章）
 *   4. 选中结果 → 跳转 /posts/[slug]
 *
 * 防 hydration mismatch（沿用 ThemeToggle 范式）：
 *   初始 mounted=false，挂载后才渲染真实交互，避免 SSR/CSR 不一致。
 *
 * 索引端点本身已做权限过滤，本组件无需关心可见性。
 */

interface SearchDoc {
  id: string;
  title: string;
  excerpt: string;
  domain: Domain;
  category: string;
  url: string;
}

interface Hit extends SearchResult {
  title: string;
  excerpt: string;
  domain: Domain;
  category: string;
  url: string;
  match: Record<string, string[]>;
}

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 8;

export default function SearchBox() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false); // 是否展开输入框
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const miniSearchRef = useRef<MiniSearch<SearchDoc> | null>(null);
  const loadingRef = useRef<Promise<void> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);

    // 点击组件外部 → 收起
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 懒加载索引：首次展开时才 fetch + 建 MiniSearch 实例 */
  async function ensureIndex() {
    if (miniSearchRef.current) return;
    if (loadingRef.current) {
      await loadingRef.current;
      return;
    }
    loadingRef.current = (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/search.json');
        const docs: SearchDoc[] = res.ok ? await res.json() : [];
        const ms = new MiniSearch<SearchDoc>({
          fields: ['title', 'excerpt'],
          storeFields: ['title', 'excerpt', 'domain', 'category', 'url'],
          searchOptions: {
            prefix: true,
            fuzzy: 0.2,
            boost: { title: 2 },
          },
        });
        ms.addAll(docs);
        miniSearchRef.current = ms;
      } catch {
        // 网络或解析失败：静默降级为空索引
        miniSearchRef.current = new MiniSearch<SearchDoc>({
          fields: ['title', 'excerpt'],
          storeFields: ['title', 'excerpt', 'domain', 'category', 'url'],
        });
      } finally {
        setLoading(false);
      }
    })();
    await loadingRef.current;
  }

  function runSearch(q: string) {
    const ms = miniSearchRef.current;
    if (!ms || !q.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }
    // search() 返回 SearchResult[]，由于配置了 storeFields，
    // 运行时对象上会带 title/excerpt/domain/url 等字段；类型上经 unknown 中转断言为 Hit
    const hits = ms.search(q).slice(0, MAX_RESULTS) as unknown as Hit[];
    setResults(hits);
    setActiveIndex(0);
  }

  function openBox() {
    setOpen(true);
    // 展开后聚焦输入框；索引懒加载触发
    requestAnimationFrame(() => inputRef.current?.focus());
    void ensureIndex();
  }

  function close() {
    setOpen(false);
    setQuery('');
    setResults([]);
    setActiveIndex(0);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => runSearch(v), DEBOUNCE_MS);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      const hit = results[activeIndex];
      if (hit) {
        e.preventDefault();
        window.location.href = hit.url;
      }
    }
  }

  function selectHit(hit: Hit) {
    window.location.href = hit.url;
  }

  // 提取命中词集合（用于高亮），跨 title/excerpt 字段合并、去重、小写
  const matchTerms = useMemo(() => {
    const terms = new Set<string>();
    for (const hit of results) {
      for (const fieldHits of Object.values(hit.match ?? {})) {
        for (const t of fieldHits) terms.add(t.toLowerCase());
      }
    }
    return terms;
  }, [results]);

  // 未挂载时渲染与挂载后一致的占位按钮，避免 hydration mismatch
  if (!mounted) {
    return (
      <button
        aria-label="搜索"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg text-text"
      >
        <span className="text-base leading-none">🔍</span>
      </button>
    );
  }

  // 收起态：图标按钮
  if (!open) {
    return (
      <button
        type="button"
        onClick={openBox}
        aria-label="搜索"
        title="搜索文章"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg text-text transition hover:border-primary hover:text-primary"
      >
        <span className="text-base leading-none">🔍</span>
      </button>
    );
  }

  // 展开态：输入框 + 下拉结果
  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={loading ? '加载索引中…' : '搜索文章…'}
          autoComplete="off"
          aria-label="搜索文章"
          className="h-9 w-44 rounded-md border border-border bg-bg px-3 text-sm text-text outline-none transition focus:border-primary focus:w-56 md:w-56"
        />
        <button
          type="button"
          onClick={close}
          aria-label="关闭搜索"
          title="关闭"
          className="ml-1 flex h-9 w-7 items-center justify-center rounded-md text-text-muted transition hover:text-text"
        >
          ✕
        </button>
      </div>

      {query.trim() && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-md border border-border bg-bg shadow-lg md:w-96">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-text-muted">
              {loading ? '加载索引中…' : '没有匹配的文章'}
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((hit, i) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => selectHit(hit)}
                    className={
                      'block w-full px-3 py-2 text-left transition ' +
                      (i === activeIndex ? 'bg-surface' : 'hover:bg-surface')
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="truncate text-sm font-medium text-text"
                        dangerouslySetInnerHTML={{
                          __html: highlight(hit.title, matchTerms),
                        }}
                      />
                      <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
                        {DOMAIN_LABELS[hit.domain] ?? hit.domain}
                      </span>
                    </div>
                    {hit.excerpt && (
                      <div
                        className="mt-0.5 line-clamp-1 text-xs text-text-muted"
                        dangerouslySetInnerHTML={{
                          __html: highlight(hit.excerpt, matchTerms),
                        }}
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 高亮命中词：把 query 词包进 <mark>。
 * 用 dangerouslySetInnerHTML 注入，因此必须先转义 HTML，再插 <mark>，
 * 防止文章标题/摘要里的 HTML 字符被解释。
 */
function highlight(text: string, terms: Set<string>): string {
  const escaped = escapeHtml(text);
  if (terms.size === 0) return escaped;
  // 按长度降序，避免短词覆盖长词（如 "type" 吃掉 "typescript"）
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const pattern = sorted
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  if (!pattern) return escaped;
  const re = new RegExp(`(${pattern})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
