import { describe, expect, it } from 'vitest';
import { BILLING_ALERT_DAYS, derivePet, MONTHLY_TIERS } from '../pet';
import type { PetInput } from '../pet';

const base: PetInput = {
  activeCount: 3,
  totalCount: 3,
  monthlyCost: 100,
  savedAnnual: 0,
  nextBilling: null,
};

describe('钱包小猪：情绪完全由花费推导', () => {
  it('没有任何订阅时沉睡，并邀请用户添加第一条', () => {
    const pet = derivePet({ ...base, activeCount: 0, totalCount: 0, monthlyCost: 0 });
    expect(pet.mood).toBe('asleep');
    expect(pet.bubble).toBe('还没有订阅，我先睡了。加一条来叫醒我。');
    expect(pet.vitality).toBe(100);
    expect(pet.tilt).toBe(0);
    expect(pet.breathSeconds).toBe(4.6);
  });

  it('全部击杀后也沉睡，但文案区分得出来', () => {
    const pet = derivePet({ ...base, activeCount: 0, totalCount: 3, monthlyCost: 0 });
    expect(pet.mood).toBe('asleep');
    expect(pet.bubble).toBe('3 个全被干掉了，我睡个安稳觉。');
  });

  it.each([
    [40, 'content'],
    [100, 'peckish'],
    [200, 'starving'],
    [500, 'fainting'],
  ])('月均 ¥%s → %s', (monthlyCost, mood) => {
    expect(derivePet({ ...base, monthlyCost }).mood).toBe(mood);
  });

  it('分档边界严格小于，¥50 已经掉到下一档', () => {
    expect(MONTHLY_TIERS[0].below).toBe(50);
    expect(derivePet({ ...base, monthlyCost: 49.99 }).mood).toBe('content');
    expect(derivePet({ ...base, monthlyCost: 50 }).mood).toBe('peckish');
  });

  it('砍掉过订阅就回血一档', () => {
    expect(derivePet({ ...base, monthlyCost: 200 }).mood).toBe('starving');
    expect(derivePet({ ...base, monthlyCost: 200, savedAnnual: 100 }).mood).toBe('peckish');
  });

  it('省下的年费超过还在流血的年费时进入回血状态', () => {
    const pet = derivePet({ ...base, monthlyCost: 100, savedAnnual: 1200 });
    expect(pet.mood).toBe('radiant');
    expect(pet.bubble).toContain('¥1200/年');
    expect(pet.particles).toEqual(['✨', '✨']);
  });

  it('扣费预警优先级最高，覆盖饥饿档位', () => {
    const pet = derivePet({
      ...base,
      monthlyCost: 500,
      nextBilling: { name: 'Netflix', days: BILLING_ALERT_DAYS - 1, amountCNY: 403.128 },
    });
    expect(pet.mood).toBe('panicking');
    expect(pet.bubble).toBe('Netflix 还有 2 天扣 ¥403，我慌了。');
  });

  it('预警窗口之外不触发恐慌', () => {
    const pet = derivePet({
      ...base,
      nextBilling: { name: 'Netflix', days: BILLING_ALERT_DAYS + 1, amountCNY: 403 },
    });
    expect(pet.mood).not.toBe('panicking');
  });
});

describe('钱包小猪：体征数值可复算', () => {
  it('活力 = 100 - 月均/6，砍过订阅再 +12', () => {
    expect(derivePet({ ...base, monthlyCost: 300 }).vitality).toBe(50);
    expect(derivePet({ ...base, monthlyCost: 300, savedAnnual: 10 }).vitality).toBe(62);
  });

  it('活力有下限，花再多也不会变成 0', () => {
    expect(derivePet({ ...base, monthlyCost: 100000 }).vitality).toBe(6);
  });

  it('倾斜角 = (100 - 活力)/12，越蔫越耷拉', () => {
    const pet = derivePet({ ...base, monthlyCost: 300 });
    expect(pet.tilt).toBeCloseTo((100 - pet.vitality) / 12, 6);
  });

  it('呼吸周期随虚弱程度加快，但不低于 1.2 秒', () => {
    const healthy = derivePet({ ...base, monthlyCost: 10 });
    const sick = derivePet({ ...base, monthlyCost: 100000 });
    expect(sick.breathSeconds).toBeLessThan(healthy.breathSeconds);
    expect(sick.breathSeconds).toBeGreaterThanOrEqual(1.2);
  });
});
