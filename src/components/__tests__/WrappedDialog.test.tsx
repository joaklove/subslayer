import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { addDays } from 'date-fns';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WrappedDialog from '../WrappedDialog';
import { buildReview } from '../../lib/review';
import { buildWrapped, buildWrappedText } from '../../lib/wrapped';
import { POSTER_H, POSTER_W } from '../../lib/poster';
import { contextOf, drawnText } from '../../test/canvas';
import { makeSubscription, renderWithProviders, seedStorage } from '../../test/render';

const anchor = addDays(new Date(), 2).toISOString();
const fixture = [
  makeSubscription({ nextBillingDate: anchor }),
  makeSubscription({ id: 'sub-2', name: '爱奇艺', amount: 25, currency: 'CNY', icon: 'iqiyi', nextBillingDate: anchor }),
  makeSubscription({ id: 'sub-3', name: 'iCloud+', amount: 21, currency: 'CNY', icon: 'icloud', nextBillingDate: anchor }),
  makeSubscription({ id: 'sub-4', name: 'Spotify', amount: 13.99, status: 'cancelled', icon: 'spotify', nextBillingDate: anchor }),
  makeSubscription({ id: 'sub-5', name: '京东PLUS', amount: 148, currency: 'CNY', billingCycle: 'yearly', status: 'cancelled', icon: 'jd', nextBillingDate: anchor }),
];

const open = () => {
  seedStorage(fixture);
  const onClose = vi.fn();
  const utils = renderWithProviders(<WrappedDialog onClose={onClose} />);
  return { onClose, ...utils };
};

const canvasText = () => {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  const ctx = contextOf(canvas);
  if (!ctx) {
    throw new Error('海报没有拿到 2D 上下文');
  }
  return drawnText(ctx);
};

const setClipboard = (writeText?: (text: string) => Promise<void>) => {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
};

const setExecCommand = (value?: (command: string) => boolean) => {
  Object.defineProperty(document, 'execCommand', { configurable: true, value });
};

afterEach(() => {
  setClipboard(undefined);
  setExecCommand(undefined);
});

describe('三页海报', () => {
  it('打开就在总览页，画布尺寸就是导出尺寸', () => {
    open();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['总览', '平台榜', '月度账单']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(POSTER_W);
    expect(canvas.height).toBe(POSTER_H);
    expect(canvasText()).toContain('¥5,389.54');
  });

  it('切到平台榜重画一张，内容跟着换', () => {
    open();
    fireEvent.click(screen.getByRole('tab', { name: '平台榜' }));

    expect(screen.getByRole('tab', { name: '平台榜' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '总览' })).toHaveAttribute('aria-selected', 'false');
    const text = canvasText();
    expect(text).toContain('谁在吸你的血');
    expect(text).not.toContain('这一年，订阅要从你兜里拿走');
  });

  it('切到月度账单画出 12 个月的日历', () => {
    open();
    fireEvent.click(screen.getByRole('tab', { name: '月度账单' }));
    expect(canvasText()).toContain('未来 12 个月的扣款日历');
  });

  it('来回切页不会堆积画布', () => {
    open();
    ['月度账单', '平台榜', '总览', '平台榜'].forEach((name) => {
      fireEvent.click(screen.getByRole('tab', { name }));
    });
    expect(document.querySelectorAll('canvas')).toHaveLength(1);
    expect(canvasText()).toContain('谁在吸你的血');
  });
});

describe('细化回顾的文字版', () => {
  it('把数据驱动的洞察逐条列出来，并标出类型', () => {
    open();
    const review = buildReview(fixture, new Date());
    const dialog = screen.getByRole('dialog', { name: '我的年度止血报告' });
    const items = within(dialog).getAllByRole('listitem');
    expect(items).toHaveLength(review.insights.length);
    review.insights.forEach((insight) => {
      expect(within(dialog).getByText(insight.text)).toBeInTheDocument();
    });
    expect(within(dialog).getByText('集中')).toBeInTheDocument();
  });

  it('空列表时不谎报洞察', () => {
    seedStorage([]);
    renderWithProviders(<WrappedDialog onClose={vi.fn()} />);
    expect(screen.getByText('没有在流血的订阅，这份回顾暂时没有素材。')).toBeInTheDocument();
    expect(canvasText()).toContain('你还没有记录任何订阅');
  });
});

describe('下载 PNG', () => {
  it('导出当前页，文件名带年份和页名，并回收 blob', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    open();
    fireEvent.click(screen.getByRole('tab', { name: '月度账单' }));
    fireEvent.click(screen.getByRole('button', { name: /下载 PNG/ }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    const link = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(link.download).toBe(`subslayer-${new Date().getFullYear()}-months.png`);
    expect(link.href).toContain('blob:');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('三页各自导出自己的文件名', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    open();
    const year = new Date().getFullYear();
    const expected = [
      ['总览', `subslayer-${year}-overview.png`],
      ['平台榜', `subslayer-${year}-platforms.png`],
      ['月度账单', `subslayer-${year}-months.png`],
    ] as const;

    for (const [tab, filename] of expected) {
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      fireEvent.click(screen.getByRole('button', { name: /下载 PNG/ }));
      await waitFor(() => expect(click).toHaveBeenCalled());
      expect((click.mock.instances.at(-1) as unknown as HTMLAnchorElement).download).toBe(filename);
    }
    click.mockRestore();
  });
});

describe('复制文案', () => {
  it('剪贴板可用时直接写入，文案与海报同源', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    open();

    fireEvent.click(screen.getByRole('button', { name: /复制文案/ }));

    expect(await screen.findByRole('button', { name: /已复制/ })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(
      buildWrappedText(buildWrapped(fixture), buildReview(fixture, new Date()))
    );
  });

  it('剪贴板被拒绝时退回 execCommand，仍然复制成功', async () => {
    setClipboard(() => Promise.reject(new Error('Write permission denied')));
    const execCommand = vi.fn(() => true);
    setExecCommand(execCommand);
    open();

    fireEvent.click(screen.getByRole('button', { name: /复制文案/ }));

    expect(await screen.findByRole('button', { name: /已复制/ })).toBeInTheDocument();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('两条路径都不可用时明确告诉用户失败，不静默假装成功', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: /复制文案/ }));
    expect(await screen.findByRole('button', { name: /复制失败/ })).toBeInTheDocument();
    expect(document.querySelector('textarea')).toBeNull();
  });
});

describe('关闭', () => {
  it('点关闭按钮回调一次', () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('点遮罩关闭，点内容区不关闭', () => {
    const { onClose } = open();
    const dialog = screen.getByRole('dialog', { name: '我的年度止血报告' });
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});