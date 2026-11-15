import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { addDays } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import SubscriptionCard from '../SubscriptionCard';
import { useSubscription } from '../../store/useSubscription';
import type { Subscription } from '../../types';
import { makeSubscription, renderWithProviders, seedStorage } from '../../test/render';

const Cards: React.FC = () => {
  const { subscriptions, battleReport } = useSubscription();
  return (
    <>
      {subscriptions.map((subscription) => (
        <SubscriptionCard key={subscription.id} subscription={subscription} />
      ))}
      {battleReport && (
        <div data-testid="report">
          {battleReport.title}|{battleReport.message}
        </div>
      )}
    </>
  );
};

const netflix = makeSubscription({
  nextBillingDate: addDays(new Date(), 2).toISOString(),
  url: 'https://www.netflix.com/account/billing',
});
const noUrl = makeSubscription({
  id: 'sub-2',
  name: '楼下健身房',
  amount: 200,
  currency: 'CNY',
  icon: undefined,
  url: undefined,
  nextBillingDate: addDays(new Date(), 5).toISOString(),
});

const stored = (): Subscription[] =>
  JSON.parse(window.localStorage.getItem('subslayer-subscriptions') ?? '[]');

describe('卡片上的品牌标与账单信息', () => {
  it('渲染真实品牌标、金额与剩余天数', () => {
    seedStorage([netflix]);
    renderWithProviders(<Cards />);

    expect(screen.getByTitle('Netflix').dataset.brand).toBe('Netflix');
    expect(screen.getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('距离下次扣款还有 2 天')).toBeInTheDocument();
    expect(screen.getByText('$55.99')).toBeInTheDocument();
  });

  it('没有品牌 slug 的自定义订阅也有图标兜底', () => {
    seedStorage([noUrl]);
    renderWithProviders(<Cards />);
    expect(screen.getByTitle('楼下健身房').dataset.brand).toBe('楼下健身房');
  });

  it('超长名字被截断，不会撑破卡片', () => {
    seedStorage([makeSubscription({ name: '超长订阅名称测试超长订阅名称测试超长订阅名称测试' })]);
    renderWithProviders(<Cards />);
    expect(screen.getByText('超长订阅名称测试超长订阅名称测试超长订阅...')).toBeInTheDocument();
  });
});

describe('击杀 → 复活', () => {
  it('击杀后立刻变成已击杀，战报按人民币年化播报', () => {
    seedStorage([netflix]);
    renderWithProviders(<Cards />);

    fireEvent.click(screen.getByRole('button', { name: /干掉它/ }));

    expect(screen.getByText('已击杀')).toBeInTheDocument();
    expect(screen.getByText('已停止流血，每年省下 ¥4837.54')).toBeInTheDocument();
    expect(screen.getByTestId('report')).toHaveTextContent(
      '击杀成功！|¥4837.54/年 从此不再从你兜里流血。'
    );
    expect(stored()[0].status).toBe('cancelled');
    expect(screen.queryByRole('button', { name: /干掉它/ })).not.toBeInTheDocument();
  });

  it('已击杀的卡片品牌标置灰', () => {
    seedStorage([makeSubscription({ status: 'cancelled' })]);
    renderWithProviders(<Cards />);
    expect(screen.getByTitle('Netflix').style.filter).toContain('grayscale');
  });

  it('复活回到活跃状态并落盘', () => {
    seedStorage([makeSubscription({ status: 'cancelled' })]);
    renderWithProviders(<Cards />);

    fireEvent.click(screen.getByTitle('误杀了？让它复活'));

    expect(screen.getByRole('button', { name: /干掉它/ })).toBeInTheDocument();
    expect(stored()[0].status).toBe('active');
  });

  it('击杀一条不影响另一条', () => {
    seedStorage([netflix, noUrl]);
    renderWithProviders(<Cards />);

    fireEvent.click(screen.getAllByRole('button', { name: /干掉它/ })[0]);

    expect(screen.getAllByRole('button', { name: /干掉它/ })).toHaveLength(1);
    expect(stored().map((sub) => sub.status)).toEqual(['cancelled', 'active']);
  });
});

describe('删除', () => {
  it('删除后卡片消失，战报播报夺回的年费', () => {
    seedStorage([netflix, noUrl]);
    renderWithProviders(<Cards />);

    fireEvent.click(screen.getAllByTitle('删除订阅')[0]);

    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
    expect(screen.getByText('楼下健身房')).toBeInTheDocument();
    expect(screen.getByTestId('report')).toHaveTextContent(
      '止血成功！|你刚刚从巨头手里夺回了 ¥4837.54/年。'
    );
    expect(stored().map((sub) => sub.id)).toEqual(['sub-2']);
  });
});

describe('去官网取消', () => {
  it('有管理链接时新标签打开并提示先登录', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    seedStorage([netflix]);
    renderWithProviders(<Cards />);

    fireEvent.click(screen.getByTitle('去官网管理自动续费'));

    expect(open).toHaveBeenCalledWith('https://www.netflix.com/account/billing', '_blank');
    expect(screen.getByText(/跳转后请先登录/)).toBeInTheDocument();
    open.mockRestore();
  });

  it('没有链接时给出微信 / 支付宝的取消路径', () => {
    seedStorage([noUrl]);
    renderWithProviders(<Cards />);

    fireEvent.click(screen.getByTitle('去官网管理自动续费'));

    const dialog = screen.getByRole('dialog', { name: '取消订阅教程' });
    expect(within(dialog).getByText(/微信 → 我 → 服务 → 钱包/)).toBeInTheDocument();
    expect(within(dialog).getByText(/支付宝 → 我的 → 设置/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '我知道了' }));
    expect(screen.queryByRole('dialog', { name: '取消订阅教程' })).not.toBeInTheDocument();
  });

  it('已击杀的卡片不再提供去官网按钮', () => {
    seedStorage([makeSubscription({ status: 'cancelled' })]);
    renderWithProviders(<Cards />);
    expect(screen.queryByTitle('去官网管理自动续费')).not.toBeInTheDocument();
  });
});