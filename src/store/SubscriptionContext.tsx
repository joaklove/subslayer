import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Subscription } from '../types';
import { nanoid } from 'nanoid';
import { calculateNextBillingDate, USD_TO_CNY_RATE } from '../lib/utils';

interface BattleReport {
  title: string;
  message: string;
}

interface SubscriptionContextType {
  subscriptions: Subscription[];
  addSubscription: (subscription: Omit<Subscription, 'id' | 'createdAt' | 'nextBillingDate'> & {
    dayOfMonth?: number;
    monthOfYear?: number;
  }) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  markAsCancelled: (id: string) => void;
  totalAnnualCost: number;
  totalMonthlyCost: number;
  totalDailyCost: number;
  totalSaved: number;
  battleReport: BattleReport | null;
  showBattleReport: (title: string, message: string) => void;
}

const calculateCost = (subscriptions: Subscription[], mode: 'annual' | 'monthly' | 'daily') => {
  const annualCost = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((total, sub) => {
      const amountInCNY = sub.currency === 'USD' ? sub.amount * USD_TO_CNY_RATE : sub.amount;
      return total + (sub.billingCycle === 'monthly' ? amountInCNY * 12 : amountInCNY);
    }, 0);

  switch (mode) {
    case 'monthly':
      return annualCost / 12;
    case 'daily':
      return annualCost / 365;
    case 'annual':
    default:
      return annualCost;
  }
};

const calculateSaved = (subscriptions: Subscription[]) => {
  return subscriptions
    .filter(sub => sub.status === 'cancelled')
    .reduce((total, sub) => {
      const amountInCNY = sub.currency === 'USD' ? sub.amount * USD_TO_CNY_RATE : sub.amount;
      return total + (sub.billingCycle === 'monthly' ? amountInCNY * 12 : amountInCNY);
    }, 0);
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const STORAGE_KEY = 'subslayer-subscriptions';

// 必须在首次渲染前同步读出：若放到 effect 里加载，保存用的 effect 会在同一批提交中
// 把空的初始 state 写回 localStorage，StrictMode 二次执行时读到的已是被覆盖的 []，数据永久丢失。
const loadSubscriptions = (): Subscription[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedSubscriptions = window.localStorage.getItem(STORAGE_KEY);
    if (!storedSubscriptions) {
      return [];
    }
    const parsedData = JSON.parse(storedSubscriptions);
    return Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.error('Failed to load subscriptions from localStorage:', error);
    return [];
  }
};

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(loadSubscriptions);
  const [battleReport, setBattleReport] = useState<BattleReport | null>(null);
  const reportTimer = useRef<number>(0);

  // 战报必须渲染在列表之上：删除会让卡片自身卸载，写在卡片里的弹窗永远没机会出现
  const showBattleReport = useCallback((title: string, message: string) => {
    window.clearTimeout(reportTimer.current);
    setBattleReport({ title, message });
    reportTimer.current = window.setTimeout(() => setBattleReport(null), 3000);
  }, []);

  useEffect(() => () => window.clearTimeout(reportTimer.current), []);

  // 保存数据到 localStorage
  useEffect(() => {
    // 确保在浏览器环境中运行
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    } catch (error) {
      console.error('Failed to save subscriptions to localStorage:', error);
      // 保存失败时不影响应用运行
    }
  }, [subscriptions]);

  const addSubscription = useCallback((subscription: Omit<Subscription, 'id' | 'createdAt' | 'nextBillingDate'> & {
    dayOfMonth?: number;
    monthOfYear?: number;
  }) => {
    const id = nanoid();
    const createdAt = new Date().toISOString();
    const { dayOfMonth, monthOfYear, ...restSubscription } = subscription;
    const nextBillingDate = calculateNextBillingDate(
      new Date(), 
      restSubscription.billingCycle, 
      dayOfMonth, 
      monthOfYear
    );

    setSubscriptions((prev) => [...prev, { ...restSubscription, id, createdAt, nextBillingDate }]);
  }, []);

  const updateSubscription = useCallback((id: string, updates: Partial<Subscription>) => {
    setSubscriptions((prev) => prev.map(sub =>
      sub.id === id ? { ...sub, ...updates } : sub
    ));
  }, []);

  const deleteSubscription = useCallback((id: string) => {
    setSubscriptions((prev) => prev.filter(sub => sub.id !== id));
  }, []);

  const markAsCancelled = useCallback((id: string) => {
    setSubscriptions((prev) => prev.map(sub =>
      sub.id === id ? { ...sub, status: 'cancelled' as const } : sub
    ));
  }, []);

  const totalAnnualCost = useMemo(() => calculateCost(subscriptions, 'annual'), [subscriptions]);
  const totalMonthlyCost = useMemo(() => calculateCost(subscriptions, 'monthly'), [subscriptions]);
  const totalDailyCost = useMemo(() => calculateCost(subscriptions, 'daily'), [subscriptions]);
  const totalSaved = useMemo(() => calculateSaved(subscriptions), [subscriptions]);

  return (
    <SubscriptionContext.Provider value={{
      subscriptions,
      addSubscription,
      updateSubscription,
      deleteSubscription,
      markAsCancelled,
      totalAnnualCost,
      totalMonthlyCost,
      totalDailyCost,
      totalSaved,
      battleReport,
      showBattleReport,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
