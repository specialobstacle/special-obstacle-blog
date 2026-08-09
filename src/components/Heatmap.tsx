import type { YearGrid, DayCell } from '../lib/heatmap';

/**
 * 写作频率热力图（React island）。
 *
 * 零依赖，手写 CSS Grid。数据已在前端外（about.astro frontmatter）
 * 经 filterVisiblePosts 聚合好，组件只负责渲染。
 *
 * 暗色模式自动跟随（用 bg-surface / bg-primary token，无写死颜色）。
 *
 * 布局对齐 GitHub 贡献图：
 *   - 列 = 周（grid-template-columns: repeat(53, 12px)，列间用 gap 控制）
 *   - 月份标签放在该月首列、允许向右溢出（white-space: nowrap），
 *     而非给每个标签固定宽度 —— 避免「X月」这种双字标签塞不下而重叠
 *   - 星期标签 + 主体共用同一套列轨道，保证标签行与格子严格对齐
 */

interface Props {
  yearData: YearGrid;
}

const WEEKDAY_LABELS = ['', '一', '', '三', '', '五', ''] as const;
const CELL = 12; // 每格 12px（h-3 w-3）
const GAP = 3; // 列/行间距 3px
const COL = CELL + GAP; // 一个列轨道占 15px

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
  const weekCount = weeks.length;
  const labelColWidth = 24; // 星期标签列宽度（留出双字格 + 间距）
  // 主体网格列模板：53 个 12px 轨道，gap 由容器 gap 控制
  const gridTemplate = `repeat(${weekCount}, ${CELL}px)`;

  return (
    <div>
      <div className="mb-2 text-sm text-text-muted">
        {year} 年共 <span className="font-semibold text-text">{total}</span>{' '}
        篇 · 绿色越深当天发文越多
      </div>

      <div className="overflow-x-auto pb-2">
        <div style={{ width: 'fit-content' }}>
          {/* 月份标签行：左侧留出星期列宽度对齐主体 */}
          <div
            className="mb-1 text-xs text-text-muted"
            style={{
              display: 'grid',
              gridTemplateColumns: gridTemplate,
              columnGap: `${GAP}px`,
              marginLeft: `${labelColWidth}px`,
              height: '1em',
            }}
          >
            {monthLabels.map((label, i) => (
              <div
                key={i}
                style={{
                  gridColumnStart: i + 1,
                  whiteSpace: 'nowrap',
                  lineHeight: '1em',
                  height: '1em',
                  overflow: 'visible',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* 星期标签列 */}
            <div
              className="mr-[3px] text-[10px] text-text-muted"
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                rowGap: `${GAP}px`,
                width: `${labelColWidth - GAP}px`,
              }}
            >
              {WEEKDAY_LABELS.map((d, i) => (
                <div
                  key={i}
                  style={{
                    height: `${CELL}px`,
                    lineHeight: `${CELL}px`,
                    textAlign: 'right',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 主体：53 列 × 7 行 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: gridTemplate,
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                columnGap: `${GAP}px`,
                rowGap: `${GAP}px`,
              }}
            >
              {weeks.map((week, col) =>
                week.map((cell, row) => (
                  <div
                    key={`${col}-${row}`}
                    title={cellTitle(cell)}
                    style={{
                      gridColumnStart: col + 1,
                      gridRowStart: row + 1,
                      width: `${CELL}px`,
                      height: `${CELL}px`,
                    }}
                    className={`rounded-sm ${levelClass(cell.count)}`}
                  />
                )),
              )}
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
