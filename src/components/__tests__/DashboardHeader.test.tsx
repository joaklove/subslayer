import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import DashboardHeader from '../DashboardHeader';
import { makeSubscription, renderWithProviders, seedStorage } from '../../test/render';

const headline = () => document.querySelector('.text-5xl') as HTMLElement;

/** 只驱动定时器，不驱动 rAF：模拟后台标签页里动画被浏览器挂起 */
const stubStalledFrames = () => {
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
};

const settle = () => {
  act(() => {
    vi.advanceTimersByTime(1500);
  });
};

afterEach(() => {
  vi.useRealTimers();
});

describe('总览金额', () => {
  it('rAF 一帧都不跑时，兜底定时器也要把金额落到真实值', () => {
    // 后台标签页里浏览器会挂起 rAF，页面上最重要的数字不能停在 ¥0
    vi.useFakeTimers();
    stubStalledFrames();

    seedStorage([makeSubscription({ amount: 100, currency: 'CNY' })]);
    renderWithProviders(<DashboardHeader onShare={vi.fn()} />);

    expect(headline()).toHaveTextContent('¥0');

    settle();

    expect(headline()).toHaveTextContent('¥1,200');
  });

  it('切换口径后同样会收敛，月度是年度的十二分之一', () => {
    vi.useFakeTimers();
    stubStalledFrames();

    seedStorage([makeSubscription({ amount: 100, currency: 'CNY' })]);
    renderWithProviders(<DashboardHeader onShare={vi.fn()} />);
    settle();

    fireEvent.click(screen.getByRole('button', { name: '月度' }));
    settle();
    expect(screen.getByText('每月的订阅费用')).toBeInTheDocument();
    expect(headline()).toHaveTextContent('¥100');

    fireEvent.click(screen.getByRole('button', { name: '每日' }));
    settle();
    expect(screen.getByText('每天的订阅费用')).toBeInTheDocument();
    expect(headline()).toHaveTextContent('¥3.29');
  });

  it('光效颜色跟着主题走，不再是写死的红色', () => {
    vi.useFakeTimers();
    stubStalledFrames();
    window.localStorage.setItem('subslayer-theme', 'sonar');

    seedStorage([makeSubscription({ amount: 100, currency: 'CNY' })]);
    renderWithProviders(<DashboardHeader onShare={vi.fn()} />);
    settle();

    expect(headline().style.textShadow).toContain('rgba(0, 224, 255');
  });
});