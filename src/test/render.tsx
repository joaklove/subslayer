import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { SubscriptionProvider } from '../store/SubscriptionContext';
import { ThemeProvider } from '../store/ThemeContext';
import type { Subscription } from '../types';

export const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'sub-1',
  name: 'Netflix',
  amount: 55.99,
  currency: 'USD',
  billingCycle: 'monthly',
  status: 'active',
  nextBillingDate: '2026-11-17T00:00:00.000Z',
  createdAt: '2026-01-05T00:00:00.000Z',
  icon: 'netflix',
  ...overrides,
});

export const seedStorage = (subscriptions: Subscription[]) => {
  window.localStorage.setItem('subslayer-subscriptions', JSON.stringify(subscriptions));
};

export const renderWithProviders = (ui: ReactNode) =>
  render(
    <ThemeProvider>
      <SubscriptionProvider>{ui}</SubscriptionProvider>
    </ThemeProvider>
  );
