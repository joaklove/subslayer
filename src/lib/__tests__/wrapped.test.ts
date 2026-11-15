import { describe, expect, it } from 'vitest';
import { annualCostCNY, buildWrapped, buildWrappedText } from '../wrapped';
import { buildReview } from '../review';
import { makeSubscription } from '../../test/render';

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

describe('单条订阅的年费折算', () => {
  it('美元月付先换汇再乘 12', () => {
    expect(annualCostCNY(netflix)).toBeCloseTo(55.99 * 7.2 * 12, 6);
  });

  it('人民币年付原样返回', () => {
    expect(annualCostCNY(jd)).toBe(148);
  });

  it('人民币月付乘 12', () => {
    expect(annualCostCNY(iqiyi)).toBe(300);
  });
});

describe('年度总览', () => {
  it('只把活跃订阅算进流血，已击杀算进省下', () => {
    const summary = buildWrapped(fixture);
    expect(summary.activeCount).toBe(3);
    expect(summary.killedCount).toBe(2);
    expect(summary.bleedingAnnual).toBeCloseTo(5389.536, 6);
    expect(summary.savedAnnual).toBeCloseTo(1356.736, 6);
  });

  it('最贵刺客取活跃订阅里年费最高的一条', () => {
    const summary = buildWrapped(fixture);
    expect(summary.priciest?.name).toBe('Netflix');
    expect(summary.priciest?.annualCNY).toBeCloseTo(4837.536, 6);
  });

  it('空列表时没有最贵刺客，判词指向沉睡的小猪', () => {
    const summary = buildWrapped([]);
    expect(summary.priciest).toBeNull();
    expect(summary.bleedingAnnual).toBe(0);
    expect(summary.headline).toBe('一条订阅都没有，钱包小猪睡得很香。');
    expect(summary.reality).toBe('目前没有正在流血的订阅。');
  });

  it('全部击杀时判词承认战果', () => {
    const summary = buildWrapped([spotify, jd]);
    expect(summary.activeCount).toBe(0);
    expect(summary.headline).toBe('2 条全干掉了，今年你是冷血杀手。');
  });

  it('省下的超过还在流血的时称为止血英雄', () => {
    const summary = buildWrapped([iqiyi, jd]);
    expect(summary.savedAnnual).toBe(148);
    expect(summary.bleedingAnnual).toBe(300);
    expect(summary.headline).toBe('还在流血，而且流得不少。');

    const hero = buildWrapped([
      makeSubscription({ id: 'x', amount: 10, currency: 'CNY' }),
      jd,
    ]);
    expect(hero.headline).toBe('省下的已经比还在流血的多，止血英雄。');
  });
});

describe('分享文案', () => {
  it('把关键数字都写进去，金额带千分位', () => {
    const text = buildWrappedText(buildWrapped(fixture));
    expect(text).toContain('3 条订阅');
    expect(text).toContain('¥5,389.54');
    expect(text).toContain('省下 ¥1,356.74/年');
    expect(text).toContain('Netflix（¥4,837.54/年）');
    expect(text).toContain('—— 订阅刺客 SubSlayer');
  });

  it('带上回顾数据时补充占比与最狠月份', () => {
    const now = new Date(2026, 10, 15);
    const review = buildReview(fixture, now);
    const text = buildWrappedText(buildWrapped(fixture), review);
    expect(text).toContain('占 90%');
    expect(text).toContain('未来一年最狠的是');
  });

  it('全击杀时不再声称还在被吸钱', () => {
    const text = buildWrappedText(buildWrapped([spotify, jd]));
    expect(text).toContain('我把 2 条订阅全干掉了');
    expect(text).not.toContain('还在被吸走');
  });
});
