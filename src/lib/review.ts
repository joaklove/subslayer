import { addMonths, addYears, isBefore, startOfMonth } from 'date-fns';
import type { Subscription } from '../types';
import { annualCostCNY } from './wrapped';
import { formatNumber, USD_TO_CNY_RATE } from './utils';

export interface PlatformRow {
  id: string;
  name: string;
  icon?: string;
  /** 一年折算成人民币的总支出 */
  annualCNY: number;
  /** 单次扣款额（人民币） */
  chargeCNY: number;
  /** 占年度总额的百分比，0-100 */
  share: number;
  billingCycle: Subscription['billingCycle'];
  currency: Subscription['currency'];
  amount: number;
}

export interface MonthCharge {
  name: string;
  amountCNY: number;
}

export interface MonthBucket {
  /** 2026-11 */
  key: string;
  /** 11月 */
  label: string;
  year: number;
  month: number;
  totalCNY: number;
  charges: MonthCharge[];
  /** 首月只统计今天之后还会扣的部分，不能拿它跟完整月比大小 */
  partial: boolean;
}

export type InsightTone = 'danger' | 'warn' | 'info' | 'success';

export interface Insight {
  tone: InsightTone;
  text: string;
}

export interface YearReview {
  platforms: PlatformRow[];
  months: MonthBucket[];
  peakMonth: MonthBucket | null;
  quietMonth: MonthBucket | null;
  busiestMonth: MonthBucket | null;
  monthlyAverage: number;
  topShare: number;
  insights: Insight[];
}

const money = (n: number) => formatNumber(n);

export const chargeCNY = (subscription: Subscription) =>
  subscription.currency === 'USD' ? subscription.amount * USD_TO_CNY_RATE : subscription.amount;

/** 按年费从大到小排的平台榜，share 是占年度总额的比例 */
export const rankPlatforms = (subscriptions: Subscription[]): PlatformRow[] => {
  const active = subscriptions.filter((sub) => sub.status === 'active');
  const total = active.reduce((sum, sub) => sum + annualCostCNY(sub), 0);

  return active
    .map((sub) => {
      const annual = annualCostCNY(sub);
      return {
        id: sub.id,
        name: sub.name,
        icon: sub.icon,
        annualCNY: annual,
        chargeCNY: chargeCNY(sub),
        share: total > 0 ? (annual / total) * 100 : 0,
        billingCycle: sub.billingCycle,
        currency: sub.currency,
        amount: sub.amount,
      };
    })
    .sort((a, b) => b.annualCNY - a.annualCNY);
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/**
 * 从每条订阅的下次扣款日出发，按计费周期推演未来 12 个月的账单。
 * 用 addMonths(anchor, n) 而不是逐月累加，避免 31 号在 2 月被夹断后一路漂移。
 * 已经过去的扣款不再计入：首月是残月，会单独标记，不参与均值和极值。
 */
export const projectMonths = (subscriptions: Subscription[], now: Date): MonthBucket[] => {
  const windowStart = startOfMonth(now);
  const windowEnd = addMonths(windowStart, 12);
  const firstIsPartial = now.getTime() !== windowStart.getTime();

  const buckets: MonthBucket[] = Array.from({ length: 12 }, (_, index) => {
    const date = addMonths(windowStart, index);
    return {
      key: monthKey(date),
      label: `${date.getMonth() + 1}月`,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      totalCNY: 0,
      charges: [],
      partial: index === 0 && firstIsPartial,
    };
  });
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  subscriptions
    .filter((sub) => sub.status === 'active')
    .forEach((sub) => {
      const anchor = new Date(sub.nextBillingDate);
      if (Number.isNaN(anchor.getTime())) {
        return;
      }
      const step = sub.billingCycle === 'monthly' ? addMonths : addYears;
      const amount = chargeCNY(sub);

      // 过期数据（上次扣款日已经过去）先推进到今天之后，最多推 240 期防死循环
      let start = 0;
      while (start < 240 && isBefore(step(anchor, start), now)) {
        start += 1;
      }

      for (let i = start; i < start + 13; i += 1) {
        const when = step(anchor, i);
        if (!isBefore(when, windowEnd)) {
          break;
        }
        const bucket = byKey.get(monthKey(when));
        if (bucket) {
          bucket.totalCNY += amount;
          bucket.charges.push({ name: sub.name, amountCNY: amount });
        }
      }
    });

  return buckets;
};

const pickExtreme = (
  months: MonthBucket[],
  compare: (a: MonthBucket, b: MonthBucket) => number
) => (months.length === 0 ? null : [...months].sort(compare)[0]);

/**
 * 数据驱动的多维判词：每条都带触发条件，数据不满足就不出现，
 * 取代原来"按金额分 6 档"的固定文案。
 */
export const buildInsights = (
  subscriptions: Subscription[],
  platforms: PlatformRow[],
  peakMonth: MonthBucket | null,
  quietMonth: MonthBucket | null,
  busiestMonth: MonthBucket | null,
  monthlyAverage: number
): Insight[] => {
  const insights: Insight[] = [];
  const active = subscriptions.filter((sub) => sub.status === 'active');

  if (platforms.length === 0) {
    return [{ tone: 'success', text: '没有在流血的订阅，这份回顾暂时没有素材。' }];
  }

  const top = platforms[0];
  if (platforms.length >= 2 && top.share >= 40) {
    insights.push({
      tone: 'danger',
      text: `「${top.name}」一家就占掉 ${top.share.toFixed(0)}%，是身上最粗的那根血管。`,
    });
  }

  if (peakMonth && monthlyAverage > 0 && peakMonth.totalCNY > monthlyAverage * 1.4) {
    insights.push({
      tone: 'warn',
      text: `${peakMonth.label}是全年最狠的一个月，要扣 ¥${money(peakMonth.totalCNY)}，比平均月多 ¥${money(peakMonth.totalCNY - monthlyAverage)}。`,
    });
  }

  const yearly = active.filter((sub) => sub.billingCycle === 'yearly');
  if (yearly.length > 0) {
    const sum = yearly.reduce((total, sub) => total + chargeCNY(sub), 0);
    insights.push({
      tone: 'info',
      text: `${yearly.length} 条年付会在到期当天一次性扣走 ¥${money(sum)}，在月度视图里完全看不见。`,
    });
  }

  const small = active.filter(
    (sub) => sub.billingCycle === 'monthly' && chargeCNY(sub) < 30
  );
  if (small.length >= 2) {
    const sum = small.reduce((total, sub) => total + annualCostCNY(sub), 0);
    insights.push({
      tone: 'warn',
      text: `${small.length} 条单价不到 ¥30/月的小订阅，一年合计 ¥${money(sum)}，最容易被忽略。`,
    });
  }

  const usd = active.filter((sub) => sub.currency === 'USD');
  if (usd.length > 0) {
    const usdAnnual = usd.reduce(
      (total, sub) => total + (sub.billingCycle === 'monthly' ? sub.amount * 12 : sub.amount),
      0
    );
    insights.push({
      tone: 'info',
      text: `${usd.length} 条按美元计价，汇率每涨 0.1，一年就多付 ¥${money(usdAnnual * 0.1)}。`,
    });
  }

  if (busiestMonth && busiestMonth.charges.length >= 3) {
    insights.push({
      tone: 'warn',
      text: `${busiestMonth.label}有 ${busiestMonth.charges.length} 笔扣款挤在一起，那天别只看余额。`,
    });
  }

  if (quietMonth && quietMonth.totalCNY === 0) {
    insights.push({
      tone: 'success',
      text: `${quietMonth.label}一分钱都不扣，是未来一年里唯一的空窗。`,
    });
  }

  return insights;
};

export const buildReview = (subscriptions: Subscription[], now: Date = new Date()): YearReview => {
  const platforms = rankPlatforms(subscriptions);
  const months = projectMonths(subscriptions, now);
  const totalProjected = months.reduce((sum, month) => sum + month.totalCNY, 0);

  // 残月天然比完整月少，拿它算均值会把平均线压低，拿它比大小则永远当选"最安静"
  const wholeMonths = months.filter((month) => !month.partial);
  const averageBase = wholeMonths.length > 0 ? wholeMonths : months;
  const monthlyAverage =
    averageBase.length > 0
      ? averageBase.reduce((sum, month) => sum + month.totalCNY, 0) / averageBase.length
      : 0;

  // 一分钱都不扣时不要指认"最狠的一个月"，那会凭空造出一个不存在的账单高峰
  const hasCharges = totalProjected > 0;
  const comparable = hasCharges ? averageBase : [];
  const peakMonth = pickExtreme(comparable, (a, b) => b.totalCNY - a.totalCNY);
  const quietMonth = pickExtreme(comparable, (a, b) => a.totalCNY - b.totalCNY);
  const busiestMonth = pickExtreme(comparable, (a, b) => b.charges.length - a.charges.length);

  return {
    platforms,
    months,
    peakMonth,
    quietMonth,
    busiestMonth,
    monthlyAverage,
    topShare: platforms.length > 0 ? platforms[0].share : 0,
    insights: buildInsights(
      subscriptions,
      platforms,
      peakMonth,
      quietMonth,
      busiestMonth,
      monthlyAverage
    ),
  };
};
