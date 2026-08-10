import { useEffect, useRef, useState } from 'react';

/**
 * 知识卡片轮播入口（React island）。
 *
 * 职责（刻意保持轻量，不碰内容渲染）：
 *   1. 标题淡入淡出轮播：每 5s 切下一张，点击当前标题打开对应弹窗
 *   2. 弹窗显隐控制：通过 data-card-modal / data-card-close 在 DOM 上
 *      定位弹窗节点，切 hidden/opacity（弹窗 body 由 CardCarousel.astro
 *      静态渲染，本组件不渲染任何 Markdown 内容）
 *
 * 防 hydration mismatch（沿用 SearchBox/ThemeToggle 范式）：
 *   mounted flag 守门，SSR 初始渲染 = 第一张标题占位（与 .astro 静态输出一致），
 *   mount 后才开始轮播与随机打乱（随机顺序只在客户端发生，保证 SSR/CSR 一致）。
 *
 * 无障碍：弹窗打开时 ESC 关闭、点遮罩关闭、aria 属性由 .astro 端提供。
 */

interface CardMeta {
  id: string;
  title: string;
}

interface CardCarouselProps {
  cards: CardMeta[];
  domainLabel: string;
  count: number;
}

const ROTATE_MS = 5000;

export default function CardCarousel({ cards, domainLabel, count }: CardCarouselProps) {
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<CardMeta[]>(cards);
  const [current, setCurrent] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // mount 后打乱顺序，开始轮播。SSR 端保持 cards 原序（第一张做占位），
  // 因此初始 current=0 在两端都指向 cards[0]，无 mismatch。
  useEffect(() => {
    setMounted(true);
    // Fisher-Yates 打乱（仅在卡片>1 时才有意义）
    if (cards.length > 1) {
      const shuffled = [...cards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setOrder(shuffled);
      setCurrent(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动轮播（mount 后、且没有弹窗打开时）
  useEffect(() => {
    if (!mounted || order.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % order.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [mounted, order.length]);

  // 弹窗显隐：openId 变化时切 DOM
  useEffect(() => {
    function show(id: string | null) {
      const modal = id ? document.querySelector(`[data-card-modal="${id}"]`) : null;
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        // 触发 opacity 过渡：先强制 reflow 再加 opacity-100
        void (modal as HTMLElement).offsetWidth;
        modal.classList.add('opacity-100');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    }
    function hide(id: string | null) {
      const modal = id ? document.querySelector(`[data-card-modal="${id}"]`) : null;
      if (modal) {
        modal.classList.remove('opacity-100');
        modal.setAttribute('aria-hidden', 'true');
        const el = modal as HTMLElement;
        setTimeout(() => {
          // 过渡结束后再 hidden，避免突兀。检查是否已被重新打开
          if (el.getAttribute('aria-hidden') === 'true') {
            el.classList.add('hidden');
            el.classList.remove('flex');
          }
        }, 200);
        document.body.style.overflow = '';
      }
    }
    if (openId) show(openId);
    return () => {
      if (openId) hide(openId);
    };
  }, [openId]);

  // ESC 关闭 + 点遮罩关闭（弹窗内的点击不冒泡到遮罩）
  useEffect(() => {
    if (!openId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenId(null);
    }
    function onDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // 点在遮罩本身（非弹窗内容）→ 关闭
      if (target.hasAttribute('data-card-modal')) {
        setOpenId(null);
      }
      // 点关闭按钮
      if (target.closest('[data-card-close]')) {
        setOpenId(null);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [openId]);

  /**
   * 点击标题打开对应弹窗。
   *
   * 从按钮 data-card-trigger 直接读 id，而不是用 order[current] 闭包——
   * 后者在轮播自动切换（setInterval → setCurrent）的瞬间可能读到 stale 的
   * current，导致「显示标题 A 却打开了弹窗 B」。从 DOM 读永远与当前渲染一致。
   */
  function openCurrent(e: React.MouseEvent<HTMLButtonElement>) {
    const id = e.currentTarget.getAttribute('data-card-trigger');
    if (id) setOpenId(id);
  }

  // SSR/未挂载占位：显示第一张标题（与 .astro 静态输出对齐）
  const displayCard = mounted ? order[current] : cards[0];
  const label = domainLabel ? `${domainLabel} · ` : '';

  return (
    <div ref={containerRef} className="flex items-center gap-2 text-sm">
      <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        卡片
      </span>
      <span className="shrink-0 text-text-muted text-xs">
        {label}{count} 张
      </span>
      {displayCard && (
        <button
          type="button"
          onClick={openCurrent}
          data-card-trigger={displayCard.id}
          className="truncate text-left text-text transition hover:text-primary"
          title={displayCard.title}
        >
          {displayCard.title}
        </button>
      )}
    </div>
  );
}
