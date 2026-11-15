import { describe, expect, it } from 'vitest';
import { buildReview, chargeCNY, projectMonths, rankPlatforms } from '../review';
import { makeSubscription } from '../../test/render';

const NOW = new Date(2026, 10, 15);

const netflix = makeSubscription();
const iqiyi = makeSubscription({
  id: 'sub-2',
  name: '爱奇艺',
  amount: 25,
  currency: 'CNY',
  icon: 'iqiyi',
});
const office = makeSubscription({
  id: 'sub-3',
  name: 'Office 365',
  amount: 498,
  currency: 'CNY',
  billingCycle: 'yearly',
  icon: 'microsoft365',
  nextBillingDate: '2027-03-10T00:00:00.000Z',
});
const killed = makeSubscription({ id: 'sub-4', name: 'Spotify', status: 'cancelled' });

describe('单次扣款额', () => {
  it('美元按固定汇率折算，不做年化处理', () => {
    expect(chargeCNY(netflix)).toBeCloseTo(403.128, 6);
    expect(chargeCNY(office)).toBe(498);
  });
});

describe('平台榜', () => {
  it('按年费降序，占比合计 100%', () => {
    const rows = rankPlatforms([iqiyi, netflix, office, killed]);
    expect(rows.map((row) => row.name)).toEqual(['Netflix', 'Office 365', '爱奇艺']);
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(100, 6);
    expect(rows[0].share).toBeCloseTo((4837.536 / (4837.536 + 498 + 300)) * 100, 6);
  });

  it('已击杀的订阅不上榜', () => {
    expect(rankPlatforms([killed])).toEqual([]);
  });

  it('保留 icon slug 供海报画品牌标', () => {
    expect(rankPlatforms([netflix])[0].icon).toBe('netflix');
  });
});

describe('未来 12 个月投影', () => {
  it('从当前月开始，一共 12 个桶', () => {
    const months = projectMonths([netflix], NOW);
    expect(months).toHaveLength(12);
    expect(months[0].key).toBe('2026-11');
    expect(months[0].label).toBe('11月');
    expect(months[11].key).toBe('2027-10');
  });

  it('月付订阅在 12 个月里各扣一次', () => {
    const months = projectMonths([netflix], NOW);
    months.forEach((month) => {
      expect(month.charges).toHaveLength(1);
      expect(month.totalCNY).toBeCloseTo(403.128, 6);
    });
  });

  it('年付订阅只在到期月出现一次', () => {
    const months = projectMonths([office], NOW);
    const charged = months.filter((month) => month.charges.length > 0);
    expect(charged).toHaveLength(1);
    expect(charged[0].key).toBe('2027-03');
    expect(charged[0].totalCNY).toBe(498);
  });

  it('31 号锚点被夹到 2 月后不会漂移出重复扣款', () => {
    const anchor = makeSubscription({
      id: 'edge',
      amount: 10,
      currency: 'CNY',
      nextBillingDate: new Date(2026, 0, 31).toISOString(),
    });
    const months = projectMonths([anchor], new Date(2026, 0, 15));
    expect(months).toHaveLength(12);
    months.forEach((month) => expect(month.charges).toHaveLength(1));
  });

  it('过期的扣款日会被推进窗口，而不是整条丢掉', () => {
    const stale = makeSubscription({
      id: 'stale',
      amount: 10,
      currency: 'CNY',
      nextBillingDate: new Date(2025, 0, 17).toISOString(),
    });
    const months = projectMonths([stale], NOW);
    expect(months.every((month) => month.charges.length === 1)).toBe(true);
  });

  it('非法日期直接跳过，不污染账单', () => {
    const broken = makeSubscription({ id: 'broken', nextBillingDate: 'not-a-date' });
    const months = projectMonths([broken], NOW);
    expect(months.every((month) => month.totalCNY === 0)).toBe(true);
  });

  it('已击杀的订阅不出现在未来账单里', () => {
    const months = projectMonths([killed], NOW);
    expect(months.every((month) => month.charges.length === 0)).toBe(true);
  });
});

describe('多维判词', () => {
  it('头部平台占比超过 40% 时点名最粗的血管', () => {
    const review = buildReview([netflix, iqiyi], NOW);
    const danger = review.insights.find((insight) => insight.tone === 'danger');
    expect(danger?.text).toContain('Netflix');
    expect(danger?.text).toContain('94%');
  });

  it('年付大额单独提示，因为月度视图看不见', () => {
    const review = buildReview([netflix, office], NOW);
    const info = review.insights.find((insight) => insight.text.includes('年付'));
    expect(info?.text).toContain('¥498');
  });

  it('年付造成的峰值月被识别出来', () => {
    const review = buildReview([netflix, office], NOW);
    expect(review.peakMonth?.key).toBe('2027-03');
    expect(review.peakMonth?.totalCNY).toBeCloseTo(403.128 + 498, 6);
    const warn = review.insights.find((insight) => insight.text.includes('最狠的一个月'));
    expect(warn?.text).toContain('3月');
  });

  it('两条以上小额月付会被单独点名', () => {
    const review = buildReview([netflix, iqiyi, makeSubscription({ id: 's', name: 'iCloud+', amount: 21, currency: 'CNY' })], NOW);
    const small = review.insights.find((insight) => insight.text.includes('小订阅'));
    expect(small?.text).toContain('2 条');
    expect(small?.text).toContain('¥552');
  });

  it('美元订阅给出汇率敏感度，数字可复算', () => {
    const review = buildReview([netflix], NOW);
    const fx = review.insights.find((insight) => insight.text.includes('汇率'));
    expect(fx?.text).toContain('¥67.19');
  });

  it('没有活跃订阅时只给一条好消息', () => {
    const review = buildReview([killed], NOW);
    expect(review.insights).toHaveLength(1);
    expect(review.insights[0].tone).toBe('success');
    expect(review.platforms).toEqual([]);
    expect(review.topShare).toBe(0);
  });

  it('平均月支出只按完整月算，残月不能把平均线压低', () => {
    const review = buildReview([netflix, office], NOW);
    const whole = review.months.filter((month) => !month.partial);
    expect(whole).toHaveLength(11);
    const total = whole.reduce((sum, month) => sum + month.totalCNY, 0);
    expect(review.monthlyAverage).toBeCloseTo(total / 11, 6);
    expect(review.monthlyAverage).toBeCloseTo(403.128 + 498 / 11, 6);
  });

  it('首月标成残月，且不再参与最狠 / 最安静 / 最密集的评比', () => {
    const review = buildReview([netflix, office], NOW);
    expect(review.months[0].partial).toBe(true);
    expect(review.months.slice(1).every((month) => !month.partial)).toBe(true);
    [review.peakMonth, review.quietMonth, review.busiestMonth].forEach((month) => {
      expect(month?.partial).toBe(false);
    });
    expect(review.peakMonth?.key).toBe('2027-03');
  });

  it('已经扣过的日子不再计入首月，只留今天之后还会扣的', () => {
    const paid = makeSubscription({
      id: 'paid',
      amount: 100,
      currency: 'CNY',
      nextBillingDate: new Date(2026, 10, 3).toISOString(),
    });
    const upcoming = makeSubscription({
      id: 'upcoming',
      amount: 200,
      currency: 'CNY',
      nextBillingDate: new Date(2026, 10, 20).toISOString(),
    });
    const months = projectMonths([paid, upcoming], NOW);
    expect(months[0].totalCNY).toBe(200);
    expect(months[0].charges.map((charge) => charge.name)).toEqual([upcoming.name]);
    expect(months[1].totalCNY).toBe(300);
  });

  it('正好是月初零点时首月不算残月，十二个月都参与均值', () => {
    const review = buildReview([netflix], new Date(2026, 10, 1));
    expect(review.months.every((month) => !month.partial)).toBe(true);
    expect(review.monthlyAverage).toBeCloseTo(403.128, 6);
  });

  it('一分钱都不扣时不指认峰值月，免得凭空造出账单高峰', () => {
    const review = buildReview([killed], NOW);
    expect(review.monthlyAverage).toBe(0);
    expect(review.peakMonth).toBeNull();
    expect(review.quietMonth).toBeNull();
    expect(review.busiestMonth).toBeNull();
    expect(review.months).toHaveLength(12);
  });
});
