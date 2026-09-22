import type { Subscription } from '../types';
import { getRealityComparison, USD_TO_CNY_RATE } from './utils';

/** 一条订阅一年要从兜里走掉多少人民币 */
export const annualCostCNY = (subscription: Subscription) => {
  const inCNY =
    subscription.currency === 'USD'
      ? subscription.amount * USD_TO_CNY_RATE
      : subscription.amount;
  return subscription.billingCycle === 'monthly' ? inCNY * 12 : inCNY;
};

export interface WrappedSummary {
  activeCount: number;
  killedCount: number;
  /** 还在流血的年费 */
  bleedingAnnual: number;
  /** 已经砍掉的年费 */
  savedAnnual: number;
  priciest: { name: string; annualCNY: number } | null;
  reality: string;
  headline: string;
}

/**
 * 年度判词。和钱包小猪一样：只从已有数据推导，不掺随机数也不掺夸奖。
 */
const pickHeadline = (
  bleeding: number,
  saved: number,
  activeCount: number,
  killedCount: number
) => {
  if (activeCount + killedCount === 0) {
    return '一条订阅都没有，钱包小猪睡得很香。';
  }
  if (activeCount === 0) {
    return `${killedCount} 条全干掉了，今年你是冷血杀手。`;
  }
  if (saved > 0 && saved >= bleeding) {
    return '省下的已经比还在流血的多，止血英雄。';
  }
  if (bleeding >= 3000) {
    return '它一次也没问过你同不同意。';
  }
  if (bleeding >= 300) {
    return '还在流血，而且流得不少。';
  }
  return '金额不大，但它在安静地自动续费。';
};

export const buildWrapped = (subscriptions: Subscription[]): WrappedSummary => {
  const active = subscriptions.filter((sub) => sub.status === 'active');
  const cancelled = subscriptions.filter((sub) => sub.status === 'cancelled');

  const bleedingAnnual = active.reduce((sum, sub) => sum + annualCostCNY(sub), 0);
  const savedAnnual = cancelled.reduce((sum, sub) => sum + annualCostCNY(sub), 0);

  const priciest = active.reduce<WrappedSummary['priciest']>((top, sub) => {
    const cost = annualCostCNY(sub);
    if (top && top.annualCNY >= cost) return top;
    return { name: sub.name, annualCNY: cost };
  }, null);

  return {
    activeCount: active.length,
    killedCount: cancelled.length,
    bleedingAnnual,
    savedAnnual,
    priciest,
    reality: getRealityComparison(bleedingAnnual),
    headline: pickHeadline(bleedingAnnual, savedAnnual, active.length, cancelled.length),
  };
};

const money = (n: number) =>
  n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });

/** 复制出去的那段话，没有 canvas 也能分享 */
export const buildWrappedText = (summary: WrappedSummary) => {
  const parts = [
    summary.activeCount > 0
      ? `我在订阅刺客记了 ${summary.activeCount} 条订阅，一年还在被吸走 ¥${money(summary.bleedingAnnual)}`
      : `我把 ${summary.killedCount} 条订阅全干掉了`,
  ];
  if (summary.savedAnnual > 0) {
    parts.push(`已经砍掉 ${summary.killedCount} 条、省下 ¥${money(summary.savedAnnual)}/年`);
  }
  if (summary.priciest) {
    parts.push(`最贵的刺客是 ${summary.priciest.name}（¥${money(summary.priciest.annualCNY)}/年）`);
  }
  parts.push(summary.reality);
  return `${parts.join('，')}。—— 订阅刺客 SubSlayer`;
};
