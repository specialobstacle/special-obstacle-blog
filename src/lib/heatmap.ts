import { filterVisiblePosts } from './visibility';

/**
 * 写作频率热力图 —— 纯逻辑层（无 React/无 DOM）。
 *
 * 数据源必须经 filterVisiblePosts(isAdmin)：私密文章对访客不计入，
 * 否则会在热力图上泄露「某天发了私密文章」这个信息。
 *
 * 网格约定（对齐 GitHub 贡献图）：
 *   - 列 = 周（共约 53 列），行 = 周日..周六（共 7 行）
 *   - 第 0 周是「包含 year-01-01 的那一周」，从该周日开始
 *   - 跨年边界（去年底/明年头）用真实日期补齐成完整矩形，count 查 counts 取
 */

const MONTH_LABELS = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
];

/** 单个格子 */
export interface DayCell {
  /** YYYY-MM-DD（UTC 切片） */
  date: string;
  /** 当天发文数 */
  count: number;
  /** 是否属于目标 year（边界补齐格为 false） */
  inYear: boolean;
}

/** 一年的热力图数据 */
export interface YearGrid {
  year: number;
  /** 每周一列，每列 7 天（周日..周六） */
  weeks: DayCell[][];
  /** 每列对应的月份标签（与 weeks 等长）；首周/月份切换处非空，其余 null */
  monthLabels: (string | null)[];
  /** 该年总发文数（仅 inYear 的格子求和） */
  total: number;
}

/**
 * 取当前 viewer 可见文章，按 published 日期聚合为「日期 → 当天发文数」。
 * key 用 toISOString().slice(0,10)，与 fillYearGrid 的日期格式一致。
 */
export async function getPostCountsByDate(
  isAdmin: boolean,
): Promise<Map<string, number>> {
  const posts = await filterVisiblePosts(isAdmin);
  const counts = new Map<string, number>();
  for (const p of posts) {
    const key = p.data.published.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * 生成一年的 53×7 网格数据。
 *
 * 算法：
 *   1. 起点 = 「包含 1/1 的周日」= 1/1 减去 (1/1 的星期几) 天
 *   2. 从起点按天递推，直到超过「包含 12/31 的周六」= 12/31 加 (6 - 12/31 星期几) 天
 *   3. 每 7 天切成一列；查 counts 取当天计数
 *   4. monthLabels：若该列第一个 inYear 日期的月份与上一列不同，标月份名
 */
export function fillYearGrid(
  year: number,
  counts: Map<string, number>,
): YearGrid {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));

  // 网格起点：year-01-01 所在周的周日
  const gridStart = new Date(yearStart);
  gridStart.setUTCDate(
    yearStart.getUTCDate() - yearStart.getUTCDay(),
  );
  // 网格终点：year-12-31 所在周的周六
  const gridEnd = new Date(yearEnd);
  gridEnd.setUTCDate(yearEnd.getUTCDate() + (6 - yearEnd.getUTCDay()));

  const weeks: DayCell[][] = [];
  const monthLabels: (string | null)[] = [];
  let total = 0;
  let lastMonth = -1;

  const cursor = new Date(gridStart);
  let colIndex = 0;
  while (cursor.getTime() <= gridEnd.getTime()) {
    const week: DayCell[] = [];
    let colFirstMonth: number | null = null;

    for (let dow = 0; dow < 7; dow++) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const inYear =
        cursor.getUTCFullYear() === year;
      const count = inYear ? (counts.get(dateStr) ?? 0) : 0;
      week.push({ date: dateStr, count, inYear });
      if (inYear) {
        total += count;
        if (colFirstMonth === null) {
          colFirstMonth = cursor.getUTCMonth();
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    weeks.push(week);
    // 月份标签：本列首个 inYear 月份与上一列不同 → 标签，否则 null
    if (colFirstMonth !== null && colFirstMonth !== lastMonth) {
      monthLabels.push(MONTH_LABELS[colFirstMonth]);
      lastMonth = colFirstMonth;
    } else {
      monthLabels.push(null);
    }
    colIndex++;
  }

  return { year, weeks, monthLabels, total };
}
