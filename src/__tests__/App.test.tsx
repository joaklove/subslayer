import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { getTheme, THEME_STORAGE_KEY } from '../lib/themes';
import type { Subscription } from '../types';
import { contextOf, drawnText } from '../test/canvas';

const stored = (): Subscription[] =>
  JSON.parse(window.localStorage.getItem('subslayer-subscriptions') ?? '[]');

// App 自带 ThemeProvider / SubscriptionProvider，外面不再套一层，避免出现两个 store 写同一个 key
const renderApp = () => render(<App />);

const addPreset = (name: string) => {
  fireEvent.click(screen.getAllByRole('button', { name: /添加订阅/ })[0]);
  const dialog = screen.getByRole('dialog', { name: '添加订阅' });
  fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(name) }));
  fireEvent.click(within(dialog).getByRole('button', { name: '添加' }));
};

const dismissReport = () => {
  fireEvent.click(screen.getByText('点击任意处关闭').closest('.fixed') as HTMLElement);
};

describe('首次打开', () => {
  it('空态、宠物、配色候选同时在场，没有编造的数据', () => {
    renderApp();
    expect(screen.getByText('还没有添加订阅')).toBeInTheDocument();
    expect(screen.getByText('钱包小猪')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '配色方案' })).toBeInTheDocument();
    expect(screen.getByText('我的大冤种指数：0%')).toBeInTheDocument();
    expect(screen.getByText('守财专家')).toBeInTheDocument();
    expect(stored()).toEqual([]);
  });
});

describe('添加 → 击杀 → 复活 → 删除 的完整闭环', () => {
  it('从空态一路走到清空，每一步都落盘', () => {
    renderApp();

    addPreset('爱奇艺');
    expect(screen.getByText('订阅列表')).toBeInTheDocument();
    expect(screen.getByTitle('爱奇艺').dataset.brand).toBe('爱奇艺');
    expect(stored()).toHaveLength(1);
    expect(stored()[0]).toMatchObject({ name: '爱奇艺', amount: 25, icon: 'iqiyi', status: 'active' });

    fireEvent.click(screen.getByRole('button', { name: /干掉它/ }));
    expect(screen.getByText('击杀成功！')).toBeInTheDocument();
    expect(screen.getByText('¥300.00/年 从此不再从你兜里流血。')).toBeInTheDocument();
    dismissReport();
    expect(screen.getByText('已击杀')).toBeInTheDocument();
    expect(stored()[0].status).toBe('cancelled');

    fireEvent.click(screen.getByTitle('误杀了？让它复活'));
    expect(screen.getByRole('button', { name: /干掉它/ })).toBeInTheDocument();
    expect(stored()[0].status).toBe('active');

    fireEvent.click(screen.getByTitle('删除订阅'));
    expect(screen.getByText('止血成功！')).toBeInTheDocument();
    dismissReport();
    expect(screen.getByText('还没有添加订阅')).toBeInTheDocument();
    expect(stored()).toEqual([]);
  });

  it('多条订阅时头部称号和冤种指数跟着涨', () => {
    renderApp();
    addPreset('Netflix');
    addPreset('Adobe Creative Cloud');

    // 89×12 + 52.99×7.2×12 = 5641.27 → 巨头合伙人
    expect(screen.getByText('巨头合伙人')).toBeInTheDocument();
    expect(screen.getByText('我的大冤种指数：56%')).toBeInTheDocument();
    expect(screen.getAllByTitle('删除订阅')).toHaveLength(2);
  });

  it('刷新后（重新挂载）数据还在', () => {
    const first = renderApp();
    addPreset('Spotify');
    first.unmount();

    renderApp();
    expect(screen.getByText('订阅列表')).toBeInTheDocument();
    expect(screen.getByTitle('Spotify')).toBeInTheDocument();
  });
});

describe('年度海报入口', () => {
  it('从头部按钮打开，三页都能切，关掉后回到列表', () => {
    renderApp();
    addPreset('Netflix');
    addPreset('爱奇艺');

    fireEvent.click(screen.getByRole('button', { name: /生成我的年度止血海报/ }));
    const dialog = screen.getByRole('dialog', { name: '我的年度止血报告' });
    expect(within(dialog).getAllByRole('tab')).toHaveLength(3);

    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    expect(drawnText(contextOf(canvas)!)).toContain('¥1,368');

    fireEvent.click(within(dialog).getByRole('tab', { name: '平台榜' }));
    expect(drawnText(contextOf(document.querySelector('canvas') as HTMLCanvasElement)!)).toContain(
      '谁在吸你的血'
    );

    fireEvent.click(within(dialog).getByRole('button', { name: '关闭' }));
    expect(screen.queryByRole('dialog', { name: '我的年度止血报告' })).not.toBeInTheDocument();
    expect(screen.getByText('订阅列表')).toBeInTheDocument();
  });

  it('重新打开时复制状态被重置，不残留上次的提示', async () => {
    renderApp();
    addPreset('爱奇艺');

    fireEvent.click(screen.getByRole('button', { name: /生成我的年度止血海报/ }));
    fireEvent.click(screen.getByRole('button', { name: /复制文案/ }));
    expect(await screen.findByRole('button', { name: /复制失败/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));

    fireEvent.click(screen.getByRole('button', { name: /生成我的年度止血海报/ }));
    expect(screen.getByRole('button', { name: /^复制文案$/ })).toBeInTheDocument();
  });
});

describe('换配色贯穿整个应用', () => {
  it('切到深海声呐后，页面变量、宠物血条、海报全部跟着走', () => {
    renderApp();
    addPreset('Netflix');

    fireEvent.click(screen.getByRole('button', { name: /深海声呐/ }));
    const sonar = getTheme('sonar');
    expect(document.documentElement.dataset.theme).toBe('sonar');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('sonar');
    expect(document.documentElement.style.getPropertyValue('--c-primary')).toBe('0 224 255');

    const glow = (document.querySelector('.text-5xl') as HTMLElement).style.textShadow;
    expect(glow).toContain('rgba(0, 224, 255');

    fireEvent.click(screen.getByRole('button', { name: /生成我的年度止血海报/ }));
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const stops = contextOf(canvas)!.createRadialGradient.mock.results[0].value as {
      addColorStop: { mock: { calls: unknown[][] } };
    };
    expect(stops.addColorStop.mock.calls.map((call) => String(call[1]))).toContain(
      'rgba(0, 224, 255, 0.22)'
    );
    expect(sonar.colors.primary).toBe('#00e0ff');
  });

  it('配色选择在重新挂载后仍然生效', () => {
    const first = renderApp();
    fireEvent.click(screen.getByRole('button', { name: /熔金账本/ }));
    first.unmount();

    renderApp();
    expect(document.documentElement.dataset.theme).toBe('ledger');
    expect(screen.getByRole('button', { name: /熔金账本/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('计费口径切换', () => {
  it('年度 / 月度 / 每日三个按钮改变说明文案', () => {
    renderApp();
    addPreset('爱奇艺');

    expect(screen.getByText('你只要躺着不动，每年就要蒸发')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '月度' }));
    expect(screen.getByText('你只要躺着不动，每月就要蒸发')).toBeInTheDocument();
    expect(screen.getByText('每月的订阅费用')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '每日' }));
    expect(screen.getByText('你只要躺着不动，每天就要蒸发')).toBeInTheDocument();
  });
});