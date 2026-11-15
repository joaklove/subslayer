import { format } from 'date-fns';
import type { Theme } from './themes';
import { ensureContrast, hexToRgb, mix, posterGradient } from './themes';
import { resolveBrand } from './brands';
import { CATEGORY_GLYPHS, GLYPH_STROKE_WIDTH, GLYPH_VIEWBOX } from './glyphs';
import type { YearReview } from './review';
import type { WrappedSummary } from './wrapped';
import { formatNumber } from './utils';

export type PosterPage = 'overview' | 'platforms' | 'months';

export const POSTER_PAGES: { id: PosterPage; label: string }[] = [
  { id: 'overview', label: '总览' },
  { id: 'platforms', label: '平台榜' },
  { id: 'months', label: '月度账单' },
];

export const POSTER_W = 1080;
export const POSTER_H = 1350;
const PAD = 88;
const CONTENT_W = POSTER_W - PAD * 2;

const FONT_STACK = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif';

const money = (n: number) => formatNumber(n);

const rgba = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const setFont = (ctx: CanvasRenderingContext2D, weight: string, px: number, italic = false) => {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${px}px ${FONT_STACK}`;
};

/** 中文没有空格可分，只能逐字量宽度换行 */
export const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    if (current && ctx.measureText(current + char).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
};

/** 从指定字号往下试，直到文案塞得进给定宽度 */
const fontThatFits = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  weight: string
) => {
  setFont(ctx, weight, startPx);
  let px = startPx;
  while (px > 24 && ctx.measureText(text).width > maxWidth) {
    px -= 4;
    setFont(ctx, weight, px);
  }
  return px;
};

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

/** simple-icons 的路径是 24×24，直接缩放画到海报上；没有路径的品牌描分类字形 */
const drawBrandGlyph = (
  ctx: CanvasRenderingContext2D,
  slug: string | undefined,
  name: string,
  x: number,
  y: number,
  size: number,
  background: string
) => {
  const brand = resolveBrand(slug, name);
  const color = ensureContrast(brand.color, background, 3.2);
  ctx.save();
  ctx.fillStyle = rgba(color, 0.16);
  roundRect(ctx, x, y, size, size, size * 0.24);
  ctx.fill();

  if (brand.path) {
    const scale = (size * 0.6) / 24;
    ctx.translate(x + size * 0.2, y + size * 0.2);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.fill(new Path2D(brand.path));
  } else {
    // 和卡片上的 lucide 图标用同一份形状数据，海报不再退回一个首字母
    const scale = (size * 0.56) / GLYPH_VIEWBOX;
    ctx.translate(x + size * 0.22, y + size * 0.22);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = GLYPH_STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    CATEGORY_GLYPHS[brand.category].forEach((shape) => {
      if (shape.tag === 'path') {
        ctx.stroke(new Path2D(shape.d));
        return;
      }
      ctx.beginPath();
      ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
      if (shape.filled) {
        ctx.fill();
      }
      ctx.stroke();
    });
  }
  ctx.restore();
};

const drawBackground = (ctx: CanvasRenderingContext2D, theme: Theme) => {
  const [from, to] = posterGradient(theme);
  const background = ctx.createLinearGradient(0, 0, POSTER_W, POSTER_H);
  background.addColorStop(0, from);
  background.addColorStop(1, to);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // 右上角一团主色辉光，让大面积底色不是死板的纯色
  const glow = ctx.createRadialGradient(POSTER_W - 120, 120, 20, POSTER_W - 120, 120, 620);
  glow.addColorStop(0, rgba(theme.colors.primary, 0.22));
  glow.addColorStop(1, rgba(theme.colors.primary, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.strokeStyle = rgba(theme.colors['gray-700'], 0.35);
  ctx.lineWidth = 1;
  for (let y = 300; y < POSTER_H; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(POSTER_W, y);
    ctx.stroke();
  }
};

const drawHeader = (ctx: CanvasRenderingContext2D, theme: Theme, pageLabel: string) => {
  setFont(ctx, '600', 26);
  ctx.fillStyle = theme.colors['gray-500'];
  ctx.fillText('SUBSLAYER · 年度订阅报告', PAD, 112);

  ctx.textAlign = 'right';
  ctx.fillStyle = theme.colors.primary;
  ctx.fillText(pageLabel, POSTER_W - PAD, 112);
  ctx.textAlign = 'left';
};

const drawFooter = (ctx: CanvasRenderingContext2D, theme: Theme, now: Date) => {
  ctx.strokeStyle = rgba(theme.colors['gray-700'], 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, 1160);
  ctx.lineTo(POSTER_W - PAD, 1160);
  ctx.stroke();

  setFont(ctx, '400', 26);
  ctx.fillStyle = theme.colors['gray-500'];
  ctx.fillText(`生成于 ${format(now, 'yyyy-MM-dd')}`, PAD, 1226);
  ctx.fillText('数据只存在你自己的浏览器里，没有上传。', PAD, 1272);

  ctx.textAlign = 'right';
  setFont(ctx, '700', 34);
  ctx.fillStyle = theme.colors.primary;
  ctx.fillText('订阅刺客 SubSlayer', POSTER_W - PAD, 1258);
  ctx.textAlign = 'left';
};

/** 判词块：锚在分隔线上方，一句话时不会在中间留出大块空白 */
const drawVerdict = (
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  lines: string[],
  bottomBaseline = 1100
) => {
  setFont(ctx, '700', 40);
  const first = bottomBaseline - (lines.length - 1) * 54;
  ctx.fillStyle = theme.colors.light;
  lines.forEach((line, index) => {
    ctx.fillText(line, PAD + 34, first + index * 54);
  });

  ctx.strokeStyle = theme.colors.primary;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(PAD, first - 34);
  ctx.lineTo(PAD, first + (lines.length - 1) * 54 + 12);
  ctx.stroke();
};

const drawStatCard = (
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accent?: string
) => {
  ctx.fillStyle = rgba(theme.colors['gray-900'], 0.66);
  ctx.strokeStyle = theme.colors['gray-700'];
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 20);
  ctx.fill();
  ctx.stroke();

  setFont(ctx, '400', 26);
  ctx.fillStyle = theme.colors['gray-400'];
  ctx.fillText(label, x + 28, y + 52);

  ctx.fillStyle = accent ?? theme.colors.light;
  fontThatFits(ctx, value, w - 56, 46, '700');
  ctx.fillText(value, x + 28, y + 122);
};

const drawOverview = (
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  summary: WrappedSummary,
  review: YearReview
) => {
  const isEmpty = summary.activeCount + summary.killedCount === 0;

  setFont(ctx, '400', 34);
  ctx.fillStyle = theme.colors['gray-400'];
  ctx.fillText(isEmpty ? '你还没有记录任何订阅' : '这一年，订阅要从你兜里拿走', PAD, 190);

  const bigLine = `¥${money(summary.bleedingAnnual)}`;
  ctx.fillStyle = theme.colors.primary;
  ctx.shadowColor = rgba(theme.colors.primary, 0.55);
  ctx.shadowBlur = 48;
  fontThatFits(ctx, bigLine, CONTENT_W, 168, '700');
  ctx.fillText(bigLine, PAD, 350);
  ctx.shadowBlur = 0;

  setFont(ctx, '400', 30);
  ctx.fillStyle = theme.colors['gray-400'];
  ctx.fillText(
    isEmpty
      ? '添加第一条订阅后，这里会变成你的年度账单。'
      : summary.activeCount > 0
        ? `每年 · 还在自动续费的 ${summary.activeCount} 条`
        : '每年 · 已经没有订阅在自动续费了',
    PAD,
    410
  );

  const stats = [
    { label: '在流血', value: `${summary.activeCount} 条`, accent: theme.colors.primary },
    { label: '已干掉', value: `${summary.killedCount} 条`, accent: theme.colors.light },
    { label: '已省下 / 年', value: `¥${money(summary.savedAnnual)}`, accent: theme.colors['green-400'] },
  ];
  const gap = 24;
  const cardW = (CONTENT_W - gap * 2) / 3;
  stats.forEach((stat, index) => {
    drawStatCard(
      ctx,
      theme,
      PAD + index * (cardW + gap),
      470,
      cardW,
      168,
      stat.label,
      stat.value,
      stat.accent
    );
  });

  let cursor = 700;
  if (summary.priciest) {
    const top = review.platforms[0];
    setFont(ctx, '400', 26);
    ctx.fillStyle = theme.colors['gray-400'];
    ctx.fillText('最贵的刺客', PAD, cursor + 22);

    drawBrandGlyph(ctx, top?.icon, summary.priciest.name, PAD, cursor + 40, 64, theme.colors.dark);

    setFont(ctx, '600', 42);
    ctx.fillStyle = theme.colors.light;
    const line = `${summary.priciest.name} · ¥${money(summary.priciest.annualCNY)}/年`;
    fontThatFits(ctx, line, CONTENT_W - 88, 42, '600');
    ctx.fillText(line, PAD + 88, cursor + 84);
    cursor += 134;
  }

  setFont(ctx, '400', 34, true);
  ctx.fillStyle = theme.colors['yellow-400'];
  ctx.fillText(summary.reality, PAD, cursor + 22);

  setFont(ctx, '700', 40);
  // 没有在流血的订阅时，"回顾没素材"不该盖掉总览自己的判词（全击杀 / 空列表）
  const verdict =
    summary.activeCount === 0 ? summary.headline : (review.insights[0]?.text ?? summary.headline);
  drawVerdict(ctx, theme, wrapText(ctx, verdict, CONTENT_W - 44));
};

const drawPlatforms = (
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  review: YearReview
) => {
  setFont(ctx, '700', 52);
  ctx.fillStyle = theme.colors.light;
  ctx.fillText('谁在吸你的血', PAD, 200);

  setFont(ctx, '400', 28);
  ctx.fillStyle = theme.colors['gray-400'];
  ctx.fillText(
    review.platforms.length > 0
      ? `${review.platforms.length} 条在流血 · 按年费排序`
      : '当前没有在流血的订阅',
    PAD,
    246
  );

  const rows = review.platforms.slice(0, 6);
  const rowH = 112;
  const top = 300;

  rows.forEach((row, index) => {
    const y = top + index * rowH;
    const isTop = index === 0;

    ctx.fillStyle = rgba(theme.colors['gray-900'], isTop ? 0.72 : 0.45);
    ctx.strokeStyle = isTop ? rgba(theme.colors.primary, 0.55) : theme.colors['gray-700'];
    ctx.lineWidth = 2;
    roundRect(ctx, PAD, y, CONTENT_W, rowH - 16, 18);
    ctx.fill();
    ctx.stroke();

    drawBrandGlyph(ctx, row.icon, row.name, PAD + 22, y + 20, 56, theme.colors.dark);

    setFont(ctx, '600', 32);
    ctx.fillStyle = theme.colors.light;
    const nameX = PAD + 96;
    fontThatFits(ctx, row.name, 420, 32, '600');
    ctx.fillText(row.name, nameX, y + 44);

    setFont(ctx, '400', 22);
    ctx.fillStyle = theme.colors['gray-500'];
    ctx.fillText(
      `${row.currency === 'USD' ? '$' : '¥'}${row.amount} / ${row.billingCycle === 'monthly' ? '月' : '年'}`,
      nameX,
      y + 74
    );

    ctx.textAlign = 'right';
    setFont(ctx, '700', 34);
    ctx.fillStyle = isTop ? theme.colors.primary : theme.colors.light;
    ctx.fillText(`¥${money(row.annualCNY)}`, POSTER_W - PAD - 24, y + 44);
    setFont(ctx, '600', 24);
    ctx.fillStyle = theme.colors['gray-400'];
    ctx.fillText(`占 ${row.share.toFixed(1)}%`, POSTER_W - PAD - 24, y + 74);
    ctx.textAlign = 'left';

    const barX = nameX + 200;
    const barW = POSTER_W - PAD - 200 - barX;
    if (barW > 40) {
      ctx.fillStyle = rgba(theme.colors['gray-700'], 0.8);
      roundRect(ctx, barX, y + 56, barW, 8, 4);
      ctx.fill();
      const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      fill.addColorStop(0, theme.colors.primary);
      fill.addColorStop(1, theme.colors.secondary);
      ctx.fillStyle = fill;
      roundRect(ctx, barX, y + 56, Math.max(6, (barW * row.share) / 100), 8, 4);
      ctx.fill();
    }
  });

  if (review.platforms.length > rows.length) {
    setFont(ctx, '400', 26);
    ctx.fillStyle = theme.colors['gray-500'];
    ctx.fillText(
      `还有 ${review.platforms.length - rows.length} 条没上榜，合计 ¥${money(
        review.platforms.slice(rows.length).reduce((sum, row) => sum + row.annualCNY, 0)
      )}/年`,
      PAD,
      top + rows.length * rowH + 6
    );
  }

  setFont(ctx, '700', 40);
  const verdict =
    review.insights.find((insight) => insight.tone === 'danger')?.text ??
    review.insights[0]?.text ??
    '每一条都在自动续费，没有一条问过你。';
  drawVerdict(ctx, theme, wrapText(ctx, verdict, CONTENT_W - 44));
};

const drawMonths = (ctx: CanvasRenderingContext2D, theme: Theme, review: YearReview) => {
  setFont(ctx, '700', 52);
  ctx.fillStyle = theme.colors.light;
  ctx.fillText('未来 12 个月的扣款日历', PAD, 200);

  const hasPartial = review.months.some((month) => month.partial);
  setFont(ctx, '400', 28);
  ctx.fillStyle = theme.colors['gray-400'];
  ctx.fillText(
    `按当前订阅推算 · 完整月平均 ¥${money(review.monthlyAverage)}${hasPartial ? ' · 首月只算剩余' : ''}`,
    PAD,
    246
  );

  const chartTop = 320;
  const chartBottom = 720;
  const chartH = chartBottom - chartTop;
  const gap = 14;
  const barW = (CONTENT_W - gap * 11) / 12;
  const max = Math.max(1, ...review.months.map((month) => month.totalCNY));

  // 平均线
  const avgY = chartBottom - (review.monthlyAverage / max) * (chartH - 40);
  ctx.strokeStyle = rgba(theme.colors['gray-500'], 0.8);
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(PAD, avgY);
  ctx.lineTo(POSTER_W - PAD, avgY);
  ctx.stroke();
  ctx.setLineDash([]);

  review.months.forEach((month, index) => {
    const x = PAD + index * (barW + gap);
    const height = Math.max(3, (month.totalCNY / max) * (chartH - 40));
    const isPeak = review.peakMonth?.key === month.key && month.totalCNY > 0;
    const color = isPeak ? theme.colors.primary : theme.colors.secondary;

    const fill = ctx.createLinearGradient(0, chartBottom - height, 0, chartBottom);
    fill.addColorStop(0, color);
    fill.addColorStop(1, mix(color, theme.colors.dark, 0.55));
    ctx.fillStyle = fill;
    if (isPeak) {
      ctx.shadowColor = rgba(color, 0.6);
      ctx.shadowBlur = 26;
    }
    // 残月画成半透明加虚线帽，一眼能看出它不是完整月，不能跟旁边的柱子比高矮
    ctx.globalAlpha = month.partial ? 0.45 : 1;
    roundRect(ctx, x, chartBottom - height, barW, height, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (month.partial) {
      ctx.strokeStyle = rgba(theme.colors.light, 0.5);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, chartBottom - height);
      ctx.lineTo(x + barW, chartBottom - height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    setFont(ctx, '600', 20);
    const compact =
      month.totalCNY >= 1000
        ? `${(month.totalCNY / 1000).toFixed(1)}k`
        : month.totalCNY.toFixed(0);
    // 大多数月份的高度就贴着平均线，数值直接写上去会被虚线划穿，先垫一块底色
    const labelW = ctx.measureText(compact).width + 14;
    const labelY = chartBottom - height - 12;
    ctx.fillStyle = rgba(theme.colors['gray-900'], 0.92);
    roundRect(ctx, x + barW / 2 - labelW / 2, labelY - 20, labelW, 26, 7);
    ctx.fill();
    ctx.fillStyle = isPeak ? theme.colors.primary : theme.colors['gray-300'];
    ctx.fillText(compact, x + barW / 2, labelY);

    setFont(ctx, '400', 22);
    ctx.fillStyle = theme.colors['gray-500'];
    ctx.fillText(month.label, x + barW / 2, chartBottom + 32);
    ctx.textAlign = 'left';
  });

  // 平均线要有身份。图例固定放在图表上方，贴着线写会撞上最高那根柱子的数值
  setFont(ctx, '600', 22);
  const avgTag = `平均 ¥${money(review.monthlyAverage)}`;
  const avgTagW = ctx.measureText(avgTag).width;
  const legendRight = POSTER_W - PAD;
  ctx.fillStyle = theme.colors['gray-400'];
  ctx.textAlign = 'right';
  ctx.fillText(avgTag, legendRight, 300);
  ctx.textAlign = 'left';
  ctx.strokeStyle = rgba(theme.colors['gray-500'], 0.9);
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(legendRight - avgTagW - 46, 293);
  ctx.lineTo(legendRight - avgTagW - 12, 293);
  ctx.stroke();
  ctx.setLineDash([]);

  const gapCards = 24;
  const cardW = (CONTENT_W - gapCards * 2) / 3;
  const cards = [
    {
      label: '最狠的一个月',
      value: review.peakMonth ? `${review.peakMonth.label} ¥${money(review.peakMonth.totalCNY)}` : '—',
      accent: theme.colors.primary,
    },
    {
      label: '最安静',
      value: review.quietMonth ? `${review.quietMonth.label} ¥${money(review.quietMonth.totalCNY)}` : '—',
      accent: theme.colors['green-400'],
    },
    {
      label: '扣款最密集',
      value: review.busiestMonth
        ? `${review.busiestMonth.label} ${review.busiestMonth.charges.length} 笔`
        : '—',
      accent: theme.colors.light,
    },
  ];
  cards.forEach((card, index) => {
    drawStatCard(
      ctx,
      theme,
      PAD + index * (cardW + gapCards),
      790,
      cardW,
      150,
      card.label,
      card.value,
      card.accent
    );
  });

  setFont(ctx, '700', 38);
  const verdict =
    review.insights.find((insight) => insight.tone === 'warn')?.text ??
    review.insights[0]?.text ??
    '每个月的扣款都一样平，说明你还没动手。';
  drawVerdict(ctx, theme, wrapText(ctx, verdict, CONTENT_W - 44).slice(0, 2));
};

export const drawPoster = (
  ctx: CanvasRenderingContext2D,
  page: PosterPage,
  summary: WrappedSummary,
  review: YearReview,
  theme: Theme,
  now: Date
) => {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.clearRect(0, 0, POSTER_W, POSTER_H);

  drawBackground(ctx, theme);
  drawHeader(
    ctx,
    theme,
    POSTER_PAGES.find((item) => item.id === page)?.label ?? ''
  );

  if (page === 'overview') {
    drawOverview(ctx, theme, summary, review);
  } else if (page === 'platforms') {
    drawPlatforms(ctx, theme, review);
  } else {
    drawMonths(ctx, theme, review);
  }

  drawFooter(ctx, theme, now);
  ctx.restore();
};
