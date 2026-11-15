import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateDaysUntilNextBilling,
  calculateNextBillingDate,
  formatAmount,
  formatNumber,
  getRealityComparison,
  truncateText,
  USD_TO_CNY_RATE,
  validateAmount,
} from '../utils';

describe('金额格式化', () => {
  it('美元符号只出现一次，且保留两位小数', () => {
    expect(formatAmount(52.99, 'USD')).toBe('$52.99');
    expect(formatAmount(25, 'CNY')).toBe('¥25.00');
  });

  it('千分位最多两位小数，动画中间帧不会拖出长尾', () => {
    expect(formatNumber(4837.536)).toBe('4,837.54');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1234567.891)).toBe('1,234,567.89');
  });

  it('汇率常量固定为 7.2', () => {
    expect(USD_TO_CNY_RATE).toBe(7.2);
  });
});

describe('现实价值换算', () => {
  it.each([
    [0, '目前没有正在流血的订阅。'],
    [-5, '目前没有正在流血的订阅。'],
    [29, '这笔钱相当于5顿午餐'],
    [30, '这笔钱相当于一杯星巴克'],
    [300, '这笔钱相当于一顿火锅'],
    [3000, '这笔钱相当于一台最新手机'],
    [8000, '这笔钱相当于一次出国游'],
  ])('¥%s → %s', (amount, expected) => {
    expect(getRealityComparison(amount)).toBe(expected);
  });

  it('极小金额也不会出现 0 顿午餐', () => {
    expect(getRealityComparison(1)).toBe('这笔钱相当于1顿午餐');
  });
});

describe('金额校验', () => {
  it.each(['0', '-1', 'abc', ''])('%s 不合法', (value) => {
    expect(validateAmount(value)).toBe(false);
  });

  it.each(['12.5', '0.01', '1000'])('%s 合法', (value) => {
    expect(validateAmount(value)).toBe(true);
  });
});

describe('下次扣款日', () => {
  it('本月扣款日已过则滚到下个月', () => {
    const result = new Date(calculateNextBillingDate(new Date(2026, 10, 20), 'monthly', 15));
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(15);
  });

  it('扣款日就是今天时算下一期，避免显示 0 天', () => {
    const result = new Date(calculateNextBillingDate(new Date(2026, 10, 20), 'monthly', 20));
    expect(result.getMonth()).toBe(11);
  });

  it('31 号在 2 月被夹到当月最后一天', () => {
    const result = new Date(calculateNextBillingDate(new Date(2026, 0, 31), 'monthly', 31));
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
  });

  it('年付滚到下一年的指定月日', () => {
    const result = new Date(calculateNextBillingDate(new Date(2026, 10, 20), 'yearly', 10, 3));
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(10);
  });
});

describe('距离扣款天数', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('按自然日计算，不受当天时刻影响', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15, 23, 30));
    expect(calculateDaysUntilNextBilling(new Date(2026, 10, 17, 1, 0).toISOString())).toBe(2);
    expect(calculateDaysUntilNextBilling(new Date(2026, 10, 15, 1, 0).toISOString())).toBe(0);
  });
});

describe('文本截断', () => {
  it('超长名字补省略号，短名字原样返回', () => {
    expect(truncateText('Netflix', 20)).toBe('Netflix');
    expect(truncateText('a'.repeat(25), 20)).toBe(`${'a'.repeat(20)}...`);
  });
});
