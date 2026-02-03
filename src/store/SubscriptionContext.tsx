import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Subscription } from '../types';
import { nanoid } from 'nanoid';
import { calculateNextBillingDate, USD_TO_CNY_RATE } from '../lib/utils';

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

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const isInitialized = useRef(false);

  // 从 localStorage 加载数据
  useEffect(() => {
    // 确保在浏览器环境中运行
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedSubscriptions = localStorage.getItem('subslayer-subscriptions');
      if (storedSubscriptions) {
        try {
          const parsedData = JSON.parse(storedSubscriptions);
          if (Array.isArray(parsedData)) {
            setSubscriptions(parsedData);
          }
        } catch (parseError) {
          console.error('Failed to parse subscriptions from localStorage:', parseError);
          // 解析失败时保持空数组
        }
      }
    } catch (error) {
      console.error('Failed to access localStorage:', error);
      // 访问失败时保持空数组
    } finally {
      // 无论成功失败，都标记为已初始化
      // 注意：即使没有读取到数据，也需要标记为已初始化，否则后续的写入会被阻止
      isInitialized.current = true;
    }
  }, []);

  // 保存数据到 localStorage
  useEffect(() => {
    // 确保在浏览器环境中运行
    if (typeof window === 'undefined') {
      return;
    }

    // 防止空覆盖写入：如果未初始化，直接返回
    if (!isInitialized.current) {
      return;
    }

    try {
      localStorage.setItem('subslayer-subscriptions', JSON.stringify(subscriptions));
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

  const totalAnnualCost = calculateCost(subscriptions, 'annual');
  const totalMonthlyCost = calculateCost(subscriptions, 'monthly');
  const totalDailyCost = calculateCost(subscriptions, 'daily');
  const totalSaved = calculateSaved(subscriptions);

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
