import { describe, expect, it } from 'vitest';
import {
  drawPoster,
  POSTER_H,
  POSTER_PAGES,
  POSTER_W,
  wrapText,
} from '../poster';
import type { PosterPage } from '../poster';
import { buildWrapped } from '../wrapped';
import { buildReview } from '../review';
import { getTheme } from '../themes';
import type { Subscription } from '../../types';
import { createMockContext, drawnText } from '../../test/canvas';
import type { MockContext } from '../../test/canvas';
import { makeSubscription } from '../../test/render';

const NOW = new Date(2026, 10, 15);
const SLATE = getTheme('slate');

const netflix = makeSubscription();
const iqiyi = makeSubscription({
  id: 'sub-2',
  name: '爱奇艺',
  amount: 25,
  currency: 'CNY',
  icon: 'iqiyi',
});
const icloud = makeSubscription({
  id: 'sub-3',
  name: 'iCloud+',
  amount: 21,
  currency: 'CNY',
  icon: 'icloud',
});
const spotify = makeSubscription({
  id: 'sub-4',
  name: 'Spotify',
  amount: 13.99,
  status: 'cancelled',
  icon: 'spotify',
});
const jd = makeSubscription({
  id: 'sub-5',
  name: '京东PLUS',
  amount: 148,
  currency: 'CNY',
  billingCycle: 'yearly',
  status: 'cancelled',
  icon: 'jd',
});

const fixture = [netflix, iqiyi, icloud, spotify, jd];

const render = (subscriptions: Subscription[], page: PosterPage, theme = SLATE) => {
  const ctx = createMockContext();
  drawPoster(
    ctx as unknown as CanvasRenderingContext2D,
    page,
    buildWrapped(subscriptions),
    buildReview(subscriptions, NOW),
    theme,
    NOW
  );
  return ctx;
};

/** 所有渐变共用一个替身对象，取它记录的色标就能验证主题真的换了 */
const gradientStops = (ctx: MockContext) => {
  const gradient = ctx.createRadialGradient.mock.results[0].value as {
    addColorStop: { mock: { calls: unknown[][] } };
  };
  return gradient.addColorStop.mock.calls.map((call) => String(call[1]));
};

describe('三页海报的骨架', () => {
  it('页签定义与绘制分支一一对应', () => {
    expect(POSTER_PAGES.map((page) => page.id)).toEqual(['overview', 'platforms', 'months']);
    expect(POSTER_PAGES.map((page) => page.label)).toEqual(['总览', '平台榜', '月度账单']);
  });

  it.each(POSTER_PAGES)('$label 页都画了页眉页脚并复位状态', ({ id, label }) => {
    const ctx = render(fixture, id);
    const text = drawnText(ctx);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, POSTER_W, POSTER_H);
    expect(text).toContain('SUBSLAYER · 年度订阅报告');
    expect(text).toContain(label);
    expect(text).toContain('生成于 2026-11-15');
    expect(text).toContain('数据只存在你自己的浏览器里，没有上传。');
    expect(text).toContain('订阅刺客 SubSlayer');
    expect(ctx.save).toHaveBeenCalledTimes(ctx.restore.mock.calls.length);
  });

  it.each(POSTER_PAGES)('$label 页没有 NaN 坐标', ({ id }) => {
    const ctx = render(fixture, id);
    [...ctx.fillText.mock.calls, ...ctx.roundRect.mock.calls, ...ctx.moveTo.mock.calls].forEach(
      (call) => {
        call.slice(0, 4).forEach((arg) => {
          if (typeof arg === 'number') {
            expect(Number.isFinite(arg)).toBe(true);
          }
        });
      }
    );
  });
});

describe('总览页', () => {
  it('金额、条数、最贵刺客都能对上列表', () => {
    const text = drawnText(render(fixture, 'overview'));
    expect(text).toContain('这一年，订阅要从你兜里拿走');
    expect(text).toContain('¥5,389.54');
    expect(text).toContain('每年 · 还在自动续费的 3 条');
    expect(text).toContain('3 条');
    expect(text).toContain('2 条');
    expect(text).toContain('¥1,356.74');
    expect(text).toContain('最贵的刺客');
    expect(text).toContain('Netflix · ¥4,837.54/年');
    expect(text).toContain('这笔钱相当于一台最新手机');
  });

  it('判词改用数据驱动的洞察，而不是固定档位文案', () => {
    const text = drawnText(render(fixture, 'overview'));
    expect(text.some((line) => line.includes('一家就占掉 90%'))).toBe(true);
  });

  it('空列表不谎称已经清零，也不画不存在的最贵刺客', () => {
    const text = drawnText(render([], 'overview'));
    expect(text).toContain('你还没有记录任何订阅');
    expect(text).toContain('添加第一条订阅后，这里会变成你的年度账单。');
    expect(text).toContain('¥0');
    expect(text).not.toContain('最贵的刺客');
    expect(text).not.toContain('每年 · 已经没有订阅在自动续费了');
  });

  it('全部击杀后才说没有订阅在自动续费', () => {
    const text = drawnText(render([spotify, jd], 'overview'));
    expect(text).toContain('每年 · 已经没有订阅在自动续费了');
    expect(text).toContain('2 条全干掉了，今年你是冷血杀手。');
  });
});

describe('平台榜页', () => {
  it('按年费排序列出每一条，并标出占比', () => {
    const ctx = render(fixture, 'platforms');
    const text = drawnText(ctx);
    expect(text).toContain('谁在吸你的血');
    expect(text).toContain('3 条在流血 · 按年费排序');
    expect(text.indexOf('Netflix')).toBeLessThan(text.indexOf('爱奇艺'));
    expect(text.indexOf('爱奇艺')).toBeLessThan(text.indexOf('iCloud+'));
    expect(text).toContain('¥4,837.54');
    expect(text).toContain('占 89.8%');
    expect(text).toContain('$55.99 / 月');
    expect(text).toContain('¥25 / 月');
  });

  it('收录的品牌画真实路径，下架的品牌描分类字形而不是首字母', () => {
    const ctx = render(fixture, 'platforms');
    expect(ctx.fill.mock.calls.some((call) => call[0] instanceof Path2D)).toBe(true);
    // 爱奇艺走 video 分类，四条 clapperboard 路径应当被描边而不是填成一个"爱"字
    expect(ctx.stroke.mock.calls.some((call) => call[0] instanceof Path2D)).toBe(true);
    expect(ctx.lineCap).toBe('round');
    expect(ctx.lineJoin).toBe('round');
    expect(drawnText(ctx)).not.toContain('爱');
  });

  it('超过 6 条时把剩下的合计单独交代，不静默截断', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      makeSubscription({
        id: `many-${index}`,
        name: `服务${index}`,
        amount: 10 + index,
        currency: 'CNY',
        icon: undefined,
      })
    );
    const text = drawnText(render(many, 'platforms'));
    expect(text).toContain('8 条在流血 · 按年费排序');
    expect(text.filter((line) => line === '服务7')).toHaveLength(1);
    expect(text).not.toContain('服务0');
    expect(text).toContain('还有 2 条没上榜，合计 ¥252/年');
  });

  it('没有在流血的订阅时给出空态而不是空图表', () => {
    const text = drawnText(render([spotify], 'platforms'));
    expect(text).toContain('当前没有在流血的订阅');
    expect(text).toContain('没有在流血的订阅，这份回顾暂时没有素材。');
  });
});

describe('月度账单页', () => {
  const office = makeSubscription({
    id: 'sub-6',
    name: 'Office 365',
    amount: 1298,
    currency: 'CNY',
    billingCycle: 'yearly',
    icon: 'microsoft365',
    nextBillingDate: '2027-03-10T00:00:00.000Z',
  });
  const withYearly = [netflix, iqiyi, office];

  it('画满 12 个月的柱子与月份标签', () => {
    const ctx = render(withYearly, 'months');
    const text = drawnText(ctx);
    expect(text).toContain('未来 12 个月的扣款日历');
    ['11月', '12月', '1月', '2月', '3月', '10月'].forEach((label) => {
      expect(text).toContain(label);
    });
    // 12 根柱子 + 3 张统计卡 + 判词强调条等都会走 roundRect
    expect(ctx.roundRect.mock.calls.length).toBeGreaterThanOrEqual(12);
    expect(ctx.setLineDash).toHaveBeenCalledWith([8, 8]);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
  });

  it('年付把峰值月顶出来，峰值柱用主色并带辉光', () => {
    const ctx = render(withYearly, 'months');
    const text = drawnText(ctx);
    expect(text).toContain('1.7k');
    expect(text).toContain('3月 ¥1,726.13');
    expect(ctx.createLinearGradient.mock.calls.length).toBeGreaterThanOrEqual(12);
    expect(ctx.shadowBlur).toBe(0);
  });

  it('三张统计卡分别给出峰值、空窗与最密集', () => {
    const text = drawnText(render(withYearly, 'months'));
    expect(text).toContain('最狠的一个月');
    expect(text).toContain('最安静');
    expect(text).toContain('扣款最密集');
    expect(text.some((line) => line.includes('3 笔'))).toBe(true);
  });

  it('判词优先说峰值月这种时间维度的发现', () => {
    const text = drawnText(render(withYearly, 'months'));
    expect(text.some((line) => line.includes('是全年最狠的一个月'))).toBe(true);
  });

  it('空列表时三张卡都是破折号，不编造月份', () => {
    const text = drawnText(render([], 'months'));
    expect(text.filter((line) => line === '—')).toHaveLength(3);
    expect(text.some((line) => line.startsWith('按当前订阅推算 · 完整月平均 ¥0'))).toBe(true);
  });

  it('数值标签垫了底色，平均虚线不会把数字划穿', () => {
    const ctx = render(fixture, 'months');
    const labels = drawnText(ctx).filter((line) => /^\d+(\.\d)?k?$/.test(line));
    expect(labels.length).toBe(12);
    // 12 个数值 + 1 个平均线标签，每个都要有自己的底片
    expect(ctx.roundRect.mock.calls.length).toBeGreaterThanOrEqual(13);
    expect(drawnText(ctx).some((line) => line.startsWith('平均 ¥'))).toBe(true);
  });

  it('首月是残月：画半透明并标注，副标题说清只算剩余', () => {
    const ctx = render(fixture, 'months');
    expect(ctx.globalAlpha).toBe(1); // 画完必须还原，不能污染后面的卡片
    expect(ctx.setLineDash.mock.calls.map((call) => call[0])).toContainEqual([5, 5]);
    expect(drawnText(ctx).some((line) => line.includes('首月只算剩余'))).toBe(true);
  });
});

describe('海报跟随主题', () => {
  it.each(POSTER_PAGES)('$label 页换成霓虹主题后辉光色也跟着换', ({ id }) => {
    const slateStops = gradientStops(render(fixture, id, SLATE));
    const neonStops = gradientStops(render(fixture, id, getTheme('neon')));
    expect(slateStops).toContain('rgba(239, 68, 68, 0.22)');
    expect(neonStops).toContain('rgba(255, 46, 136, 0.22)');
    expect(slateStops[0]).not.toBe(neonStops[0]);
  });
});

describe('中文逐字换行', () => {
  it('按测量宽度断行，不丢字', () => {
    const ctx = createMockContext();
    const text = '一二三四五六七八九十甲乙丙丁戊己庚辛壬癸';
    const lines = wrapText(ctx as unknown as CanvasRenderingContext2D, text, 120);
    expect(lines).toEqual(['一二三四五六七八九十', '甲乙丙丁戊己庚辛壬癸']);
    expect(lines.join('')).toBe(text);
  });

  it('短文案只有一行，空串不产生空行', () => {
    const ctx = createMockContext();
    const asCtx = ctx as unknown as CanvasRenderingContext2D;
    expect(wrapText(asCtx, '短句', 860)).toEqual(['短句']);
    expect(wrapText(asCtx, '', 860)).toEqual([]);
  });
});