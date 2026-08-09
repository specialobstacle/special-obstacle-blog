import type { YearGrid, DayCell } from '../lib/heatmap';

/**
 * 写作频率热力图（React island）。
 *
 * 零依赖，手写 div 网格。数据已在前端外（about.astro frontmatter）
 * 经 filterVisiblePosts 聚合好，组件只负责渲染。
 *
 * 暗色模式自动跟随（用 bg-surface / bg-primary token，无写死颜色）。
 */

interface Props {
  yearData: YearGrid;
}

const WEEKDAY_LABELS = ['', '一', '', '三', '', '五', ''] as const;

/** 按计数分 4 档着色 */
function levelClass(count: number): string {
  if (count <= 0) return 'bg-surface';
  if (count === 1) return 'bg-primary/30';
  if (count === 2) return 'bg-primary/60';
  return 'bg-primary';
}

function cellTitle(cell: DayCell): string {
  return `${cell.date}${cell.inYear ? ` · ${cell.count} 篇` : ''}`;
}

export default function Heatmap({ yearData }: Props) {
  const { weeks, monthLabels, total, year } = yearData;

  return (
    <div>
      <div className="mb-2 text-sm text-text-muted">
        {year} 年共 <span className="font-semibold text-text">{total}</span>{' '}
        篇 · 绿色越深当天发文越多
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* 月份标签行：与下方网格列对齐 */}
          <div
            className="mb-1 flex text-xs text-text-muted"
            style={{ paddingLeft: '1.5rem' }}
          >
            {monthLabels.map((label, i) => (
              <div
                key={i}
                className="flex-shrink-0 text-left"
                style={{ width: '14px', height: '1em', marginRight: '0' }}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {/* 星期标签列 */}
            <div className="mr-1 flex flex-col gap-[2px] text-[10px] leading-[12px] text-text-muted">
              {WEEKDAY_LABELS.map((d, i) => (
                <div key={i} className="h-3 w-3 text-right">
                  {d}
                </div>
              ))}
            </div>

            {/* 主体：每列一周 × 7 行 */}
            <div className="flex gap-[2px]">
              {weeks.map((week, col) => (
                <div key={col} className="flex flex-col gap-[2px]">
                  {week.map((cell, row) => (
                    <div
                      key={row}
                      title={cellTitle(cell)}
                      className={`h-3 w-3 rounded-sm ${levelClass(cell.count)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 图例 */}
          <div className="mt-3 flex items-center gap-1 text-xs text-text-muted">
            <span className="mr-1">少</span>
            <div className="h-3 w-3 rounded-sm bg-surface" title="0 篇" />
            <div className="h-3 w-3 rounded-sm bg-primary/30" title="1 篇" />
            <div className="h-3 w-3 rounded-sm bg-primary/60" title="2 篇" />
            <div className="h-3 w-3 rounded-sm bg-primary" title="3+ 篇" />
            <span className="ml-1">多</span>
          </div>
        </div>
      </div>
    </div>
  );
}
