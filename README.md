# 订阅刺客 SubSlayer

把"你只要躺着不动，每年就要被订阅吸走多少钱"摆在你面前，然后给你一个按钮亲手干掉它。

纯前端单页应用，没有后端、没有登录、没有埋点 —— 所有数据只待在你自己的浏览器里。

## 它能做什么

- **记账**：从 12 家常用平台的预设里挑，或手动添加一条订阅（金额、币种、月付/年付、下次扣款日）。预设网格排在表单之前，点一下自动填好。
- **品牌标**：每条订阅都带自己的图标。simple-icons 收录的品牌画官方路径与官方色；被上游下架的（爱奇艺、腾讯视频、优酷、百度网盘、Office 365、Adobe、京东）保留官方主色 + 分类字形兜底，不退回灰色首字母。
- **痛感换算**：实时算出年度/月度/每日流失总额，并翻译成"这笔钱相当于一顿火锅 / 一台最新手机"。
- **钱包小猪**：一只情绪完全由你的真实花费推导的电子宠物。花得越多它越蔫，砍掉订阅它就回血。
- **干掉它 / 复活**：一键把订阅标记为已取消，弹出战报告诉你每年省下多少人民币（美元按固定汇率折算）。误杀可以复活。
- **去官网**：有网页管理入口的平台直接跳到会员中心/账单页；没有入口的给出微信、支付宝关闭自动续费的详细路径。
- **年度止血报告**：Canvas 现场画三页 1080×1350 竖版海报 —— 总览、平台榜、月度账单，下载 PNG 或复制文案都能直接分享，不接任何第三方服务。
- **四套配色**：石板红（现行）、熔金账本、深海声呐、霓虹屠宰场。候选常驻在页面顶部，各自用自己的色板预览，点一下全站即时生效并记在本机。

## 快速开始

```bash
npm install
npm run dev         # 本地开发
npm run build       # 类型检查 + 产物构建到 dist/
npm run lint        # ESLint
npm test            # Vitest 跑一遍
npm run test:watch  #  watch 模式
npm run check       # tsc + eslint + vitest 三连
npm run preview     # 预览构建产物
```

> 如果这个项目位于 `Open Code` monorepo 工作区内，依赖会被提升到仓库根的 `node_modules`。
> 这种情况下**不要**在本目录执行 `npm install`（会破坏提升结构），请到工作区根目录安装。

## 技术栈

React 18 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3 · date-fns · lucide-react · simple-icons · Vitest 2 + Testing Library

## 目录结构

```
src/
├── App.tsx                    # 页面骨架，挂载 Provider
├── components/
│   ├── DashboardHeader.tsx    # 总额、现实价值换算、称号、年度/月度/每日切换
│   ├── ThemePicker.tsx        # 四套配色候选，常驻页面顶部
│   ├── BrandIcon.tsx          # 品牌标：simple-icons 路径 / 分类字形兜底
│   ├── WalletPet.tsx          # 钱包小猪的展示层
│   ├── SubscriptionList.tsx   # 列表与空状态
│   ├── SubscriptionCard.tsx   # 单条订阅：干掉它 / 复活 / 去官网 / 删除
│   ├── BattleReport.tsx       # 击杀战报弹窗（渲染在应用层）
│   ├── WrappedDialog.tsx      # 三页 Canvas 海报：绘制 + 下载 PNG + 复制文案
│   └── AddSubscriptionDialog.tsx
├── store/
│   ├── SubscriptionContext.tsx  # Provider：状态、持久化、派生总额
│   ├── useSubscription.ts       # Context 对象与消费 hook
│   ├── ThemeContext.tsx         # Provider：把主题写进 :root 的 CSS 变量
│   └── useTheme.ts
├── lib/
│   ├── pet.ts                 # 纯函数：花费 → 宠物情绪
│   ├── wrapped.ts             # 纯函数：订阅列表 → 年度统计与判词
│   ├── review.ts              # 纯函数：平台榜 + 未来 12 个月账单 + 多维判词
│   ├── poster.ts              # Canvas 绘制三页海报
│   ├── brands.ts              # slug / 名字 → 品牌路径、主色、分类
│   ├── glyphs.ts              # 分类字形的原始形状，DOM 与 Canvas 共用
│   ├── themes.ts              # 四套主题的 18 个种子色与派生色槽
│   ├── utils.ts               # 日期、金额、汇率、现实换算
│   └── constants.ts           # 预设订阅
├── test/                      # 测试基建：jsdom setup、Canvas 记录替身、渲染助手
└── types/index.ts             # Subscription 等类型
```

## 数据与持久化

存储键：`localStorage['subslayer-subscriptions']`，值为 `Subscription[]` 的 JSON；
配色单独存在 `localStorage['subslayer-theme']`。

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

## 年度回顾怎么算

判词不再是"按金额分 6 档"的固定文案，每一条都有触发条件，数据不满足就不出现：

- **平台榜**：按年费降序，给出每家的占比；海报只画前 6 名，剩下的单独交代条数与合计，不静默截断。
- **月度账单**：从每条订阅的下次扣款日出发推演 12 个月。用 `addMonths(anchor, n)` 而不是逐月累加，
  避免 31 号在 2 月被夹断后一路漂移。已经扣过的日子不再计入。
- **残月不参与评比**：首月只统计今天之后还会扣的部分，画成半透明加虚线帽。
  平均值、最狠 / 最安静 / 扣款最密集都只在完整月里选 —— 否则残月永远当选"最安静"，平均线也会被压低。
- 触发式判词包括：单家占比 ≥40%、峰值月 > 均值 1.4 倍、年付一次性扣款、
  ¥30/月以下的小订阅合计、美元汇率敏感度、单月扣款笔数 ≥3、全年零扣款的空窗月。

## 配色

每套主题只手写 18 个种子色，其余深浅（卡片底、描边、状态芯片底）由 `mix()` 推导，
再写进 `:root` 的 `--c-*` 变量，Tailwind 通过 `rgb(var(--c-slot) / <alpha-value>)` 取值。
组件里不出现写死的色值，换主题不会留下"半套旧配色"。

品牌色是例外：Netflix 就该是红的。深色卡片上看不清时（Notion 是纯黑），
`ensureContrast()` 保持色相不变、朝背景反方向推到达标为止。
四套主题都跑过 WCAG 校验：正文 ≥4.5，强调色 ≥3。

## 测试

```bash
npm test
```

255 个用例，16 个文件，覆盖工具函数、宠物规则、品牌解析、主题对比度、年度回顾、
Canvas 海报绘制、Context 持久化，以及组件与整页交互闭环。
Canvas 用记录调用的替身断言"真的画了什么"，`glyphs.test.tsx` 会把海报用的字形数据
和 lucide 真实渲染结果逐条对账，防止两边漂移。

> monorepo 里有两份 React（根 18.3.1、本目录 18.2.0）。`vitest.config.ts` 把 react 全家桶
> 钉到测试库实际解析到的那一份，否则渲染器和组件各用一份 React，hook 会直接报错。
> 因此测试跑在 18.3.1 上，开发与构建跑在 18.2.0 上，两者都是 React 18。

## 部署

托管在 Vercel，构建命令 `npm run build`，输出目录 `dist`。
`vercel.json` 把所有路径重写到 `/`，让前端路由在直接访问子路径时不会 404。

## 已知缺口

- `zustand` 在依赖里，但状态管理实际用的是 React Context。
- 汇率写死 7.2，不随行情更新。
- 海报导出只有 PNG，没有 SVG / 长图拼接。
