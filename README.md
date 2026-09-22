# 订阅刺客 SubSlayer

把"你只要躺着不动，每年就要被订阅吸走多少钱"摆在你面前，然后给你一个按钮亲手干掉它。

纯前端单页应用，没有后端、没有登录、没有埋点 —— 所有数据只待在你自己的浏览器里。

## 它能做什么

- **记账**：从 12 家常用平台的预设里挑，或手动添加一条订阅（金额、币种、月付/年付、下次扣款日）。
- **痛感换算**：实时算出年度/月度/每日流失总额，并翻译成"这笔钱相当于一顿火锅 / 一台最新手机"。
- **钱包小猪**：一只情绪完全由你的真实花费推导的电子宠物。花得越多它越蔫，砍掉订阅它就回血。
- **干掉它 / 复活**：一键把订阅标记为已取消，弹出战报告诉你每年省下多少人民币（美元按固定汇率折算）。误杀可以复活。
- **去官网**：有网页管理入口的平台直接跳到会员中心/账单页；没有入口的给出微信、支付宝关闭自动续费的详细路径。

## 快速开始

```bash
npm install
npm run dev      # 本地开发
npm run build    # 类型检查 + 产物构建到 dist/
npm run lint     # ESLint
npm run preview  # 预览构建产物
```

> 如果这个项目位于 `Open Code` monorepo 工作区内，依赖会被提升到仓库根的 `node_modules`。
> 这种情况下**不要**在本目录执行 `npm install`（会破坏提升结构），请到工作区根目录安装。

## 技术栈

React 18 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3 · date-fns · lucide-react

## 目录结构

```
src/
├── App.tsx                    # 页面骨架，挂载 Provider
├── components/
│   ├── DashboardHeader.tsx    # 总额、现实价值换算、称号、年度/月度/每日切换
│   ├── WalletPet.tsx          # 钱包小猪的展示层
│   ├── SubscriptionList.tsx   # 列表与空状态
│   ├── SubscriptionCard.tsx   # 单条订阅：干掉它 / 复活 / 去官网 / 删除
│   ├── BattleReport.tsx       # 击杀战报弹窗（渲染在应用层）
│   └── AddSubscriptionDialog.tsx
├── store/
│   ├── SubscriptionContext.tsx  # Provider：状态、持久化、派生总额
│   └── useSubscription.ts       # Context 对象与消费 hook
├── lib/
│   ├── pet.ts                 # 纯函数：花费 → 宠物情绪
│   ├── utils.ts               # 日期、金额、汇率、现实换算
│   └── constants.ts           # 预设订阅
└── types/index.ts             # Subscription 等类型
```

## 数据与持久化

存储键：`localStorage['subslayer-subscriptions']`，值为 `Subscription[]` 的 JSON。

```ts
interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: 'CNY' | 'USD';
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'cancelled';
  nextBillingDate: string;   // ISO
  url?: string;
  icon?: string;
  createdAt: string;         // ISO
}
```

读取发生在 `useState` 的惰性初始化函数里，而不是 effect 里。这是刻意的：如果放到 effect，
保存用的 effect 会在同一批提交中把空的初始 state 写回 localStorage，而 StrictMode 下二次挂载
读到的已经是被覆盖的 `[]`，数据就永久丢了。

美元折算使用写死的 `USD_TO_CNY_RATE = 7.2`，不随行情更新。

## 钱包小猪的规则

宠物的每一个表现都能从下面的公式复算出来 —— 它不许撒谎。

| 状态 | 触发条件 | 标签 |
| --- | --- | --- |
| 沉睡中 | 没有进行中的订阅 | 灰 |
| 扣费预警 | 最近一笔扣款在 3 天内 | 红 |
| 回血中 | 已省下的年费 ≥ 当前年费 | 蓝 |
| 吃饱了 | 月均支出 < ¥50 | 绿 |
| 有点饿 | < ¥150 | 黄 |
| 饿瘦了 | < ¥400 | 橙 |
| 快饿晕 | ≥ ¥400 | 深红 |

砍掉过订阅会让饥饿档位往回升一档。体力值 `clamp(100 − 月均支出 / 6, 6, 100)`，
有过击杀再 `+12`，上限 100；它同时驱动血条颜色（>60 绿、>30 黄、否则红）、小猪的饱和度、
呼吸动画周期和身体倾斜角度（`(100 − 体力) / 12` 度）。

动画遵循 `prefers-reduced-motion`：开启后呼吸、粒子、影子动效全部关闭。

## 部署

托管在 Vercel，构建命令 `npm run build`，输出目录 `dist`。
`vercel.json` 把所有路径重写到 `/`，让前端路由在直接访问子路径时不会 404。

## 已知缺口

- 头部写着"点击右上角分享我的止血成就"，但分享卡片还没实现。
- 预设订阅里的 `icon` 是 simple-icons 的 slug，目前没有任何地方渲染它。
- `zustand` 在依赖里，但状态管理实际用的是 React Context。
- 项目没有自动化测试，改动靠 `tsc` + ESLint + 构建 + 手动验证兜底。
