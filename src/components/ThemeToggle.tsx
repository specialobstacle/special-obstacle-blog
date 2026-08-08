import { useEffect, useState } from 'react';

/**
 * 主题切换按钮。
 *
 * 关键点：实际"应用主题"的逻辑放在 BaseLayout 的内联阻塞脚本里，
 * 保证首屏不闪白；本组件只负责切换按钮的状态展示与点击回调。
 */
export default function ThemeToggle() {
  // 初始为 null，避免 SSR 与首屏客户端不一致导致 hydration mismatch
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // 组件挂载时读真实状态（html 是否已有 dark 类）
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    const root = document.documentElement;
    root.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // 无痕模式或禁用 localStorage 时静默忽略
    }
  }

  if (isDark === null) {
    // 占位，避免按钮跳动
    return (
      <button
        aria-label="切换主题"
        className="h-9 w-9 rounded-md border border-border text-text"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? '切换到浅色' : '切换到深色'}
      title={isDark ? '切换到浅色' : '切换到深色'}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-text transition hover:border-primary hover:text-primary"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
