import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddSubscriptionDialog from '../AddSubscriptionDialog';
import { presetSubscriptions } from '../../lib/constants';
import { resolveBrand } from '../../lib/brands';
import type { Subscription } from '../../types';
import { renderWithProviders } from '../../test/render';

const stored = (): Subscription[] =>
  JSON.parse(window.localStorage.getItem('subslayer-subscriptions') ?? '[]');

const open = () => {
  const onClose = vi.fn();
  const utils = renderWithProviders(<AddSubscriptionDialog isOpen onClose={onClose} />);
  return { onClose, ...utils };
};

const nameInput = () => screen.getByPlaceholderText('例如：Netflix');
const amountInput = () => screen.getByPlaceholderText('0');
const submit = () => fireEvent.click(screen.getByRole('button', { name: '添加' }));

describe('预设区', () => {
  it('isOpen 为 false 时不渲染', () => {
    renderWithProviders(<AddSubscriptionDialog isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('12 条预设全部带品牌标，没有灰色首字母占位', () => {
    open();
    const dialog = screen.getByRole('dialog', { name: '添加订阅' });
    presetSubscriptions.forEach((preset) => {
      const tile = within(dialog).getByTitle(resolveBrand(preset.icon).title);
      expect(tile.dataset.brand).toBe(resolveBrand(preset.icon).title);
      expect(tile.querySelector('svg')).not.toBeNull();
    });
  });

  it('Netflix 用真实路径，爱奇艺用分类字形', () => {
    open();
    const dialog = screen.getByRole('dialog', { name: '添加订阅' });
    expect(within(dialog).getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
    expect(within(dialog).getByTitle('爱奇艺').querySelector('.lucide-clapperboard')).not.toBeNull();
  });

  it('点预设把名称、金额、货币、链接一次填好', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: /Adobe Creative Cloud/ }));

    expect(nameInput()).toHaveValue('Adobe Creative Cloud');
    expect(amountInput()).toHaveValue(52.99);
    expect(screen.getByDisplayValue('美元 ($)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('例如：https://www.netflix.com/account')).toHaveValue(
      'https://account.adobe.com/plans'
    );
  });
});

describe('提交时带上 icon slug', () => {
  it('选预设后提交，slug 原样存下来', () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: /爱奇艺/ }));
    submit();

    expect(stored()).toHaveLength(1);
    expect(stored()[0]).toMatchObject({ name: '爱奇艺', amount: 25, icon: 'iqiyi' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('手输名字也能认出品牌', () => {
    open();
    fireEvent.change(nameInput(), { target: { value: '腾讯视频 VIP' } });
    fireEvent.change(amountInput(), { target: { value: '30' } });
    submit();

    expect(stored()[0].icon).toBe('tencentvideo');
  });

  it('认不出的服务不硬塞一个错品牌', () => {
    open();
    fireEvent.change(nameInput(), { target: { value: '我家楼下的健身房' } });
    fireEvent.change(amountInput(), { target: { value: '200' } });
    submit();

    expect(stored()[0].icon).toBeUndefined();
    expect(stored()[0].name).toBe('我家楼下的健身房');
  });

  it('改名字后重新推断，不沿用上一个预设的图标', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: /Netflix/ }));
    fireEvent.change(nameInput(), { target: { value: 'Spotify' } });
    submit();

    expect(stored()[0].icon).toBe('spotify');
  });

  it('年付周期存下月份，下次扣款日可解析', () => {
    open();
    fireEvent.change(nameInput(), { target: { value: '京东PLUS' } });
    fireEvent.change(amountInput(), { target: { value: '148' } });
    fireEvent.change(screen.getByDisplayValue('每月'), { target: { value: 'yearly' } });
    fireEvent.change(screen.getByDisplayValue(`${new Date().getMonth() + 1} 月`), {
      target: { value: '3' },
    });
    submit();

    expect(stored()[0].billingCycle).toBe('yearly');
    expect(Number.isNaN(new Date(stored()[0].nextBillingDate).getTime())).toBe(false);
    expect(stored()[0].icon).toBe('jd');
  });
});

describe('校验与关闭', () => {
  it('名称和金额都为空时给出错误，不写入任何数据', () => {
    const { onClose } = open();
    submit();

    expect(screen.getByText('请输入服务名称')).toBeInTheDocument();
    expect(screen.getByText('请输入金额')).toBeInTheDocument();
    expect(stored()).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('金额为 0 被拒绝', () => {
    open();
    fireEvent.change(nameInput(), { target: { value: '测试' } });
    fireEvent.change(amountInput(), { target: { value: '0' } });
    submit();

    expect(screen.getByText('请输入有效的金额')).toBeInTheDocument();
    expect(stored()).toEqual([]);
  });

  it('管理链接必须以 http 开头', () => {
    open();
    fireEvent.change(nameInput(), { target: { value: '测试' } });
    fireEvent.change(amountInput(), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('例如：https://www.netflix.com/account'), {
      target: { value: 'ftp://example.com' },
    });
    submit();

    expect(screen.getByText('请输入以 http 开头的有效链接')).toBeInTheDocument();
    expect(stored()).toEqual([]);
  });

  it('补齐必填项后错误提示消失', () => {
    open();
    submit();
    expect(screen.getByText('请输入服务名称')).toBeInTheDocument();

    fireEvent.change(nameInput(), { target: { value: '测试' } });
    expect(screen.queryByText('请输入服务名称')).not.toBeInTheDocument();
  });

  it('取消按钮直接关闭，不写数据', () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(stored()).toEqual([]);
  });
});