import React from 'react';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionProvider } from '../SubscriptionContext';
import { useSubscription } from '../useSubscription';
import { ThemeProvider } from '../ThemeContext';
import { makeSubscription, seedStorage } from '../../test/render';

const STORAGE_KEY = 'subslayer-subscriptions';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <SubscriptionProvider>{children}</SubscriptionProvider>
  </ThemeProvider>
);

const strictWrapper = ({ children }: { children: ReactNode }) => (
  <React.StrictMode>{wrapper({ children })}</React.StrictMode>
);

const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');

const netflix = makeSubscription();
const iqiyi = makeSubscription({
  id: 'sub-2',
  name: '爱奇艺',
  amount: 25,
  currency: 'CNY',
  icon: 'iqiyi',
});
const killed = makeSubscription({
  id: 'sub-3',
  name: '京东PLUS',
  amount: 148,
  currency: 'CNY',
  billingCycle: 'yearly',
  status: 'cancelled',
  icon: 'jd',
});

describe('启动时的数据加载', () => {
  it('首帧就把 localStorage 里的订阅读出来', () => {
    seedStorage([netflix, iqiyi]);
    const { result } = renderHook(() => useSubscription(), { wrapper });
    expect(result.current.subscriptions.map((sub) => sub.name)).toEqual(['Netflix', '爱奇艺']);
  });

  it('StrictMode 二次挂载不会用空数组盖掉已存的数据', () => {
    seedStorage([netflix, iqiyi, killed]);
    const { result } = renderHook(() => useSubscription(), { wrapper: strictWrapper });
    expect(result.current.subscriptions).toHaveLength(3);
    expect(stored()).toHaveLength(3);
  });

  it('没有存过数据时给空列表，并把它写回去', () => {
    const { result } = renderHook(() => useSubscription(), { wrapper });
    expect(result.current.subscriptions).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it('存的内容被改坏时不崩溃，退回空列表', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.setItem(STORAGE_KEY, '{ 这不是 JSON');
    const { result } = renderHook(() => useSubscription(), { wrapper });
    expect(result.current.subscriptions).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('存的是对象而不是数组时也退回空列表', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"subscriptions":[]}');
    const { result } = renderHook(() => useSubscription(), { wrapper });
    expect(result.current.subscriptions).toEqual([]);
  });
});

describe('增删改都立刻落盘', () => {
  it('新增时补齐 id / createdAt / nextBillingDate', () => {
    const { result } = renderHook(() => useSubscription(), { wrapper });
    act(() => {
      result.current.addSubscription({
        name: '腾讯视频',
        amount: 30,
        currency: 'CNY',
        billingCycle: 'monthly',
        status: 'active',
        icon: 'tencentvideo',
        dayOfMonth: 15,
      });
    });

    const [added] = result.current.subscriptions;
    expect(added.id).toBeTruthy();
    expect(added.icon).toBe('tencentvideo');
    expect(Number.isNaN(new Date(added.createdAt).getTime())).toBe(false);
    expect(Number.isNaN(new Date(added.nextBillingDate).getTime())).toBe(false);
    expect(stored()[0].id).toBe(added.id);
  });

  it('击杀只改状态，金额立刻从支出挪到省下', () => {
    seedStorage([netflix]);
    const { result } = renderHook(() => useSubscription(), { wrapper });
    const before = result.current.totalAnnualCost;
    expect(result.current.totalSaved).toBe(0);

    act(() => result.current.markAsCancelled('sub-1'));

    expect(result.current.subscriptions[0].status).toBe('cancelled');
    expect(result.current.totalAnnualCost).toBe(0);
    expect(result.current.totalSaved).toBeCloseTo(before, 6);
    expect(stored()[0].status).toBe('cancelled');
  });

  it('复活把状态改回 active，省下归零', () => {
    seedStorage([killed]);
    const { result } = renderHook(() => useSubscription(), { wrapper });
    expect(result.current.totalSaved).toBe(148);

    act(() => result.current.updateSubscription('sub-3', { status: 'active' }));

    expect(result.current.subscriptions[0].status).toBe('active');
    expect(result.current.totalSaved).toBe(0);
    expect(result.current.totalAnnualCost).toBe(148);
    expect(stored()[0].status).toBe('active');
  });

  it('删除只移除目标那一条', () => {
    seedStorage([netflix, iqiyi]);
    const { result } = renderHook(() => useSubscription(), { wrapper });
    act(() => result.current.deleteSubscription('sub-1'));

    expect(result.current.subscriptions.map((sub) => sub.id)).toEqual(['sub-2']);
    expect(stored().map((sub: { id: string }) => sub.id)).toEqual(['sub-2']);
  });

  it('全部删空后存的就是空数组，不是残留旧数据', () => {
    seedStorage([netflix]);
    const { result } = renderHook(() => useSubscription(), { wrapper });
    act(() => result.current.deleteSubscription('sub-1'));
    expect(stored()).toEqual([]);
  });

  it('更新任意字段都是合并而不是替换', () => {
    seedStorage([netflix]);
    const { result } = renderHook(() => useSubscription(), { wrapper });
    act(() => result.current.updateSubscription('sub-1', { amount: 60 }));

    expect(result.current.subscriptions[0]).toMatchObject({
      id: 'sub-1',
      name: 'Netflix',
      currency: 'USD',
      amount: 60,
    });
  });
});

describe('总额换算', () => {
  it('年 / 月 / 日三种口径互相自洽，美元先换汇', () => {
    seedStorage([netflix, iqiyi, killed]);
    const { result } = renderHook(() => useSubscription(), { wrapper });
    const annual = 55.99 * 7.2 * 12 + 25 * 12;

    expect(result.current.totalAnnualCost).toBeCloseTo(annual, 6);
    expect(result.current.totalMonthlyCost).toBeCloseTo(annual / 12, 6);
    expect(result.current.totalDailyCost).toBeCloseTo(annual / 365, 6);
    expect(result.current.totalSaved).toBe(148);
  });

  it('空列表时所有口径都是 0', () => {
    const { result } = renderHook(() => useSubscription(), { wrapper });
    expect(result.current.totalAnnualCost).toBe(0);
    expect(result.current.totalMonthlyCost).toBe(0);
    expect(result.current.totalDailyCost).toBe(0);
    expect(result.current.totalSaved).toBe(0);
  });
});

describe('战报', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('展示后 5 秒自动消失', () => {
    const { result } = renderHook(() => useSubscription(), { wrapper });
    act(() => result.current.showBattleReport('击杀成功！', '省下一笔'));
    expect(result.current.battleReport).toEqual({ title: '击杀成功！', message: '省下一笔' });

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.battleReport).toBeNull();
  });

  it('连续击杀时后一条覆盖前一条，且重新计时', () => {
    const { result } = renderHook(() => useSubscription(), { wrapper });
    act(() => result.current.showBattleReport('第一条', 'a'));
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.showBattleReport('第二条', 'b'));
    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.battleReport?.title).toBe('第二条');
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.battleReport).toBeNull();
  });

  it('手动关闭后不会被旧定时器再次弹出', () => {
    const { result } = renderHook(() => useSubscription(), { wrapper });
    act(() => result.current.showBattleReport('击杀成功！', '省下一笔'));
    act(() => result.current.dismissBattleReport());
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.battleReport).toBeNull();
  });
});

describe('Provider 缺失时尽早报错', () => {
  it('useSubscription 在 Provider 外抛错', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSubscription())).toThrow(/SubscriptionProvider/);
    spy.mockRestore();
  });
});