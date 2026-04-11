# Pricing 改版需求方案

> **文档版本:** v1.2  
> **日期:** 2026-04-12  
> **目标:** 重构定价体系，砍掉 10 Credits 一次性购买，调整为 Free/Hobby/Pro 三档定价，引入月付/年付双周期与试用期赠送机制
>
> **v1.2 更新:** 补充 polar/webhook.ts、e2e utils.ts、user.ts 死代码清理、BillingCycle import 清单、assertUnreachable 修正（附录 D）
>
> **v1.1 更新:** 补充 plans.ts 数据结构设计（附录 A）、trial_period_days 精确实现（附录 B）、PricingPage Toggle 交互规格（附录 C）

---

## 一、当前状态（现状分析）

### 1.1 当前定价结构

| 计划 | 价格 | 类型 | ZeroClaw 实例 |
|------|------|------|---------------|
| Hobby | $9.99/month | 订阅 | 有（支付后自动开通 Server B） |
| Pro | $19.99/month | 订阅 | 有（支付后自动开通 Server B） |
| 10 Credits | $9.99 | 一次性购买 | 无 |

### 1.2 当前代码涉及文件

| 文件 | 作用 | 当前逻辑 |
|------|------|----------|
| `app/src/payment/plans.ts` | PaymentPlanId 枚举 + 计划配置 | 定义 `Hobby / Pro / Credits10` 三个枚举值 |
| `app/src/payment/PricingPage.tsx` | 定价页面 UI | 渲染 3 张定价卡片（Hobby $9.99、Pro $19.99、Credits10 $9.99） |
| `app/src/payment/stripe/webhook.ts` | Stripe Webhook 处理 | `invoice.paid` 时 Credits10 走 `updateUserCredits`，Hobby/Pro 走 `updateUserSubscription` + `provisionZeroclawJob` |
| `app/src/payment/stripe/paymentProcessor.ts` | 支付处理器 | 根据 `effect.kind` 区分 `subscription`(订阅) / `credits`(一次性) 的 Checkout Session Mode |
| `app/src/payment/stripe/checkoutUtils.ts` | Checkout Session 创建 | `mode: "subscription"` 或 `mode: "payment"` |
| `app/src/payment/user.ts` | 用户订阅/积分更新 | `updateUserCredits`（积分增加）、`updateUserSubscription`（订阅状态更新） |
| `app/src/payment/operations.ts` | 前端调用的支付操作 | `generateCheckoutSession` 接收 planId 创建 Checkout |
| `app/src/user/AccountPage.tsx` | 账户页面 | 显示当前计划、积分、"Buy More Credits" 按钮 |
| `app/schema.prisma` | 数据库模型 | `User.credits` 默认 3，`User.subscriptionPlan` 可选 |
| `app/.env.server` | 环境变量 | `PAYMENTS_CREDITS_10_PLAN_ID` 等 |
| `e2e-tests/tests/pricingPageTests.spec.ts` | E2E 测试 | 包含 "Make test payment with Stripe for 10 credits" 测试用例 |

---

## 二、目标定价结构

| 计划 | 月付 | 年付 | ZeroClaw 实例 | 一次性额度 | 用户自带 API |
|------|------|------|---------------|-----------|-------------|
| **Free** | $0/month | $0/year | 无 | 3 credits | N/A |
| **Hobby** | $3.99/month | $9.99/year | Server B（付款后直接开通） | 无 | 是 |
| **Pro** | $6.99/month | $16.99/year | Server B（付款后直接开通） | 无 | 是 |

### 2.1 试用期 / 赠送规则

| 计划 | 月付 | 年付 |
|------|------|------|
| **Hobby** | 免费 **试用 30 天** | 首年赠送额外 **30 天**有效期 |
| **Pro** | 免费 **试用 14 天** | 首年赠送额外 **14 天**有效期 |
| **Free** | 不适用 | 不适用 |

**试用/赠送逻辑说明：**
- **月付试用期**：用户月付后立即开通 ZeroClaw 实例，前 N 天为免费试用期（期间如不满意可取消，不扣费）
- **年付赠送**：用户年付后立即开通 ZeroClaw 实例，首年在原 12 个月基础上额外赠送 N 天有效期（即 Hobby 首年可用 12 个月 + 30 天 = 390 天；Pro 首年可用 12 个月 + 14 天 = 374 天）

---

## 三、改动范围（Scope）

### 3.1 必须改动的文件

#### C1. `app/src/payment/plans.ts` — 计划定义重构

**完整目标代码见附录 A。以下是要点摘要：**

1. 移除 `Credits10` 枚举值
2. 移除 `paymentPlans` 中 `Credits10` 的配置项
3. 移除 `prettyPaymentPlanName` 中 `Credits10` 的映射
4. 移除 `PaymentPlanEffect` 的 `credits` kind，只保留 `{ kind: "subscription" }`
5. `getPaymentProcessorPlanId` 签名从 `() => string` 改为 `(billingCycle: BillingCycle) => string`
6. 新增 `trialDays` 字段（Hobby=30, Pro=14），供 checkoutUtils 使用
7. `getPaymentPlanIdByPaymentProcessorPlanId` 需遍历月付+年付两组 Price ID 匹配
8. 新增 `BillingCycle` 类型：`"monthly" | "yearly"`
9. Free 计划不需要 PaymentPlanId 枚举值（由 `subscriptionPlan === null` 表示）

#### C2. `app/src/payment/PricingPage.tsx` — 定价页面 UI 重构

**完整交互规格见附录 C。以下是要点摘要：**

1. 移除 `Credits10` 相关卡片
2. 新增 Free 计划卡片（$0，3 credits，无 ZeroClaw 实例）
3. 修改 Hobby 卡片（月付 $3.99，年付 $9.99，自带 API，ZC 实例，30天试用）
4. 修改 Pro 卡片（月付 $6.99，年付 $16.99，自带 API，ZC 实例，14天试用）
5. 新增月付/年付 Toggle 组件（默认 Monthly，不持久化）
6. Free 卡片：未登录→"Get Started"，已登录+Free→"Current Plan" disabled
7. Free 计划不触发 Checkout Session
8. `bestDealPaymentPlanId` 保持 `PaymentPlanId.Pro`
9. Toggle 切换时仅更新 Hobby/Pro 价格和后缀，Free 卡片不受影响
10. `paymentPlanCards` 数据结构扩展为含 `monthlyPrice` + `yearlyPrice`
11. `handleBuyNowClick` 签名改为接收 `(paymentPlanId, billingCycle)` 两个参数

#### C3. `app/src/payment/operations.ts` — 支付操作

**完整代码见附录 B 的 operations.ts 部分。以下是要点摘要：**

1. Zod Schema 从 `z.nativeEnum(PaymentPlanId)` 改为 `z.object({ planId: z.nativeEnum(PaymentPlanId), billingCycle: z.enum(["monthly", "yearly"]) })`
2. 解构 `{ planId, billingCycle }` 后，将两者传递给 `paymentProcessor.createCheckoutSession`
3. Free 计划不应触发此操作（前端拦截，后端 `planId` 枚举不含 free 也会天然拒绝）

#### C4. `app/src/payment/stripe/webhook.ts` — Webhook 处理

**当前：** `handleInvoicePaid` 中 Credits10 分支走 `updateUserCredits`，Hobby/Pro 走 `updateUserSubscription` + `provisionZeroclawJob`

**改为：**
1. 移除 `PaymentPlanId.Credits10` 的 case 分支（整个 case 块删除）
2. 移除对 `updateUserCredits` 的 import 和调用
3. Hobby/Pro 逻辑保持不变（仍触发 `provisionZeroclawJob`）
4. **不需要额外试用期逻辑**（trial_period_days 由 Stripe Checkout Session 层面处理，详见附录 B）
5. `switch` 的 `default: assertUnreachable(paymentPlanId)` **保留**，不做修改（TypeScript 穷尽检查仍然有效）

#### C5. `app/src/payment/stripe/checkoutUtils.ts` — Checkout Session 创建

**完整代码见附录 B。以下是要点摘要：**

1. `CreateStripeCheckoutSessionParams` 新增 `trialPeriodDays?: number`
2. 在 `stripeClient.checkout.sessions.create` 中新增 `subscription_data: { trial_period_days }` 参数
3. 参数值来源：`paymentPlans[planId].trialDays`（Hobby=30, Pro=14），月付和年付统一使用相同值
4. 移除 `getInvoiceCreationConfig` 中 `mode === "payment"` 的分支（不再有一次性购买）

#### C6. `app/src/user/AccountPage.tsx` — 账户页面

**当前：** 显示积分、"Buy More Credits" 按钮

**改为：**
1. 移除 "Buy More Credits" 按钮（不再有 Credits10 购买入口）
2. Free 用户仍显示积分（3 credits），但无购买更多积分的入口
3. 订阅用户显示当前计划和剩余试用期（如有）

#### C7. `app/schema.prisma` — 数据库模型

**当前：** `User.credits` 默认 3

**改为：**
1. `User.credits` 保持不变（Free 用户有 3 credits，订阅用户不需要 credits）
2. **不需要新增字段** — 试用期由 Stripe 管理（trial_period_days），Server A 不需要持久化试用结束时间

#### C8. `app/.env.server` + `.env.server.example` — 环境变量

**移除：**
- `PAYMENTS_CREDITS_10_PLAN_ID`
- `PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID`
- `PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID`

**新增：**
```
PAYMENTS_HOBBY_MONTHLY_PLAN_ID=price_xxx
PAYMENTS_HOBBY_YEARLY_PLAN_ID=price_xxx
PAYMENTS_PRO_MONTHLY_PLAN_ID=price_xxx
PAYMENTS_PRO_YEARLY_PLAN_ID=price_xxx
```

#### C9. `e2e-tests/tests/pricingPageTests.spec.ts` + `e2e-tests/tests/utils.ts` — E2E 测试

**当前：** 包含 10 Credits 支测试；`makeStripePayment` 的 `planId` 类型包含 `"credits10"`

**改为：**

**`pricingPageTests.spec.ts`：**
1. 移除 "Make test payment with Stripe for 10 credits" 测试用例
2. 新增月付/年付切换测试
3. 更新已有测试以适配新的定价卡片结构（3 张卡片变为 Free / Hobby / Pro）

**`utils.ts`：**
1. `makeStripePayment` 的 `planId` 类型从 `"hobby" | "pro" | "credits10"` 改为 `{ planId: "hobby" | "pro", billingCycle: "monthly" | "yearly" }`
2. 移除 `if (planId === "credits10")` 分支（Line 130-132）
3. 适配 PricingPage 新结构：由于卡片不再用 `aria-describedby={planId}` 定位（Free 卡片没有 planId），定位逻辑需要更新

#### C10. `app/src/payment/paymentProcessor.ts` — 支付处理器接口

**当前：** `CreateCheckoutSessionArgs` 接口不含 billingCycle

**改为：** 新增 `billingCycle: BillingCycle` 字段（详见附录 B 的接口定义）

#### C11. `app/src/payment/polar/webhook.ts` — Polar Webhook（当前未使用但存在）

**当前：** 包含 `case PaymentPlanId.Credits10:` 分支，import 了 `PaymentPlanId.Credits10`

**改为：**
1. 移除 `case PaymentPlanId.Credits10:` 分支和其中对 `updateUserCredits` 的调用
2. **必须修改**：虽然当前使用 Stripe 而非 Polar，但该文件 import 了 `PaymentPlanId`，删除 `Credits10` 枚举值后会导致编译错误

#### C12. `app/src/payment/user.ts` — 用户订阅工具函数

**当前：** 导出 `updateUserSubscription` 和 `updateUserCredits` 两个函数

**改为：**
1. `updateUserCredits` 函数变为死代码（所有调用方已移除），**应删除**整个函数及其相关的 `UpdateUserCreditsArgs` 接口
2. `updateUserSubscription` 保持不变
3. `fetchUserPaymentProcessorUserId` 保持不变
4. `updateUserPaymentProcessorUserId` 保持不变

---

### 3.2 不在改动范围内（Out of Scope / 不动）

| 文件/模块 | 原因 |
|-----------|------|
| `app/src/zeroclaw/*` | ZeroClaw 开通逻辑不变，Hobby/Pro 付款后仍自动开通 |
| Server B（amigo.agentkm.com） | Provisioning API 和 ZeroClaw 实例管理不变 |
| `app/src/auth/*` | 认证逻辑不变 |
| `app/src/demo-ai-app/*` | AI 功能不变 |
| `app/src/landing-page/*` | 首页不变（除非需更新提及定价的部分） |
| `app/src/analytics/*` | 统计逻辑不变 |
| `app/src/admin/*` | 管理后台不变 |
| `app/main.wasp` | 路由/页面/Job 声明不变（仅 PaymentPlanId 枚举变化，Wasp 不感知） |
| `app/src/payment/CheckoutResultPage.tsx` | 支付结果页面逻辑不变，无 Credits10 引用 |
| `app/src/payment/lemonSqueezy/*` | 当前未使用，已确认无 Credits10 引用，无需修改 |

---

## 四、边界与约束

### 4.1 业务边界

| 约束 | 说明 |
|------|------|
| Free 用户 3 credits | 注册即赠送 3 credits，用完不再补充；不提供购买更多积分的渠道 |
| 试用期不扣费 | 月付试用期（Hobby 30天、Pro 14天）内取消不扣款，Stripe `trial_period_days` 实现 |
| 年付赠送天数 | 仅首年赠送，续费不赠送（Stripe `trial_period_days` 仅首次订阅生效） |
| 已有订阅用户 | 现有 Hobby $9.99 和 Pro $19.99 订阅用户需要平滑过渡（迁移策略见下方） |
| 已有 Credits10 用户 | 已购买 10 Credits 的用户不受影响，积分保留在账户中 |
| ZeroClaw 实例 | Hobby 和 Pro 均在 Server B 上开通，无区别 |
| 取消订阅 | 取消后 ZeroClaw 实例停用（现有逻辑已支持） |

### 4.2 技术边界

| 约束 | 说明 |
|------|------|
| 支付处理器 | 继续使用 Stripe，不切换 |
| Checkout Mode | Hobby/Pro 均为 `mode: "subscription"`（不再有 `mode: "payment"`） |
| 无需 Stripe 产品重建 | 在 Stripe Dashboard 中新建对应的 Price 对象（月付/年付各一个 Price） |
| 前端不使用新的 UI 库 | 继续使用 shadcn/ui + Tailwind CSS |
| 月付/年付切换 | 前端 Toggle 组件，切换后更新显示价格和 Checkout Price ID |

### 4.3 现有用户迁移策略

| 场景 | 处理方式 |
|------|----------|
| 现有 Hobby ($9.99/mo) 订阅用户 | 保持现有订阅不变，直到用户主动切换到新价格。Stripe 可通过 Customer Portal 让用户迁移 |
| 现有 Pro ($19.99/mo) 订阅用户 | 同上 |
| 已购买 10 Credits 的用户 | 积分保留，不影响。但不再提供购买更多积分的入口 |
| Free 用户 | 自动享受新的 Free 计划（3 credits，无变化） |

---

## 五、实施步骤（按依赖顺序）

### Phase 1: Stripe 配置（先于代码改动）

1. **在 Stripe Dashboard 中创建新的 Price 对象：**
   - Hobby Monthly: $3.99/month（recurring）
   - Hobby Yearly: $9.99/year（recurring, yearly）
   - Pro Monthly: $6.99/month（recurring）
   - Pro Yearly: $16.99/year（recurring, yearly）
2. **记录每个 Price 的 `price_xxx` ID**
3. **更新 `.env.server` 中的环境变量**

### Phase 2: 后端代码改动

| 步骤 | 文件 | 操作 |
|------|------|------|
| P2.1 | `app/src/payment/plans.ts` | 移除 Credits10，重构为支持月付/年付双 Price ID |
| P2.2 | `app/.env.server` + `.env.server.example` | 移除旧变量，添加新的月付/年付 Price ID 变量 |
| P2.3 | `app/src/payment/operations.ts` | 扩展 generateCheckoutSession 接收 billingCycle 参数 |
| P2.4 | `app/src/payment/stripe/checkoutUtils.ts` | 添加 trial_period_days 支持 |
| P2.5 | `app/src/payment/stripe/webhook.ts` | 移除 Credits10 分支（不需要额外试用期逻辑） |
| P2.6 | `app/src/payment/stripe/paymentProcessor.ts` | 适配新计划配置，mode 硬编码为 "subscription"，删除死代码 |
| P2.7 | `app/src/payment/paymentProcessor.ts` | 新增 billingCycle 字段到 CreateCheckoutSessionArgs |
| P2.8 | `app/src/payment/user.ts` | 删除 updateUserCredits 死代码 |
| P2.9 | `app/src/payment/polar/webhook.ts` | 移除 Credits10 分支（防止编译报错） |

### Phase 3: 前端代码改动

| 步骤 | 文件 | 操作 |
|------|------|------|
| P3.1 | `app/src/payment/PricingPage.tsx` | 重构定价卡片 UI，添加月付/年付切换，添加 Free 卡片，移除 Credits10 |
| P3.2 | `app/src/user/AccountPage.tsx` | 移除 "Buy More Credits" 按钮，适配新定价 |

### Phase 4: 测试代码更新

| 步骤 | 文件 | 操作 |
|------|------|------|
| P4.1 | `e2e-tests/tests/pricingPageTests.spec.ts` + `e2e-tests/tests/utils.ts` | 移除 Credits10 测试，更新 makeStripePayment 类型和逻辑，添加月付/年付测试 |

### Phase 5: 构建与部署

| 步骤 | 操作 |
|------|------|
| P5.1 | `cd app && wasp build` |
| P5.2 | `REACT_APP_API_URL=https://api.agentkm.com npx vite build` |
| P5.3 | `git add -A && git commit && git push` |
| P5.4 | 等待 1Panel 自动部署，或手动触发 |
| P5.5 | 更新服务器 docker-compose.yml 中的环境变量 |

---

## 六、测试方案

### 6.1 单元/逻辑测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| `parsePaymentPlanId("credits10")` 抛出异常 | 调用函数 | 抛出 `Invalid PaymentPlanId: credits10` |
| `parsePaymentPlanId("hobby")` 正常返回 | 调用函数 | 返回 `PaymentPlanId.Hobby` |
| `getSubscriptionPaymentPlanIds()` | 调用函数 | 返回 `[Hobby, Pro]`（不含 Credits10） |
| 月付 Price ID 选择 | `plans.ts` 中选择 monthly Price | 返回正确的 Stripe Price ID |
| 年付 Price ID 选择 | `plans.ts` 中选择 yearly Price | 返回正确的 Stripe Price ID |

### 6.2 集成测试（Stripe 测试模式）

| 测试项 | 操作 | 预期结果 |
|--------|------|----------|
| 购买 Hobby 月付 | Stripe 测试卡支付 | 订阅状态变 active，ZeroClaw 实例自动开通，有 30 天 trial |
| 购买 Hobby 年付 | Stripe 测试卡支付 | 订阅状态变 active，ZeroClaw 实例自动开通，有 30 天赠送 |
| 购买 Pro 月付 | Stripe 测试卡支付 | 订阅状态变 active，ZeroClaw 实例自动开通，有 14 天 trial |
| 购买 Pro 年付 | Stripe 测试卡支付 | 订阅状态变 active，ZeroClaw 实例自动开通，有 14 天赠送 |
| 取消订阅 | Stripe Portal 取消 | ZeroClaw 实例 suspended |
| Free 用户注册 | 新用户注册 | 显示 3 credits，无 ZeroClaw 实例 |

### 6.3 前端 UI 测试

| 测试项 | 操作 | 预期结果 |
|--------|------|----------|
| 定价页面显示 | 访问 /pricing | 显示 Free / Hobby / Pro 三张卡片，无 10 Credits 卡片 |
| 月付/年付切换 | 点击 Toggle | 价格在月付和年付之间切换显示 |
| Free 卡片按钮 | 未登录状态 | 显示 "Get Started" 跳转注册 |
| Free 卡片按钮 | 已登录 Free 用户 | 显示 "Current Plan" 不可点击 |
| Hobby 卡片价格 | 月付模式 | 显示 "$3.99/month" |
| Hobby 卡片价格 | 年付模式 | 显示 "$9.99/year" |
| Pro 卡片价格 | 月付模式 | 显示 "$6.99/month" |
| Pro 卡片价格 | 年付模式 | 显示 "$16.99/year" |
| 账户页面 | 登录后访问 /account | 不显示 "Buy More Credits" 按钮 |

### 6.4 E2E 测试

| 测试项 | 操作 | 预期结果 |
|--------|------|----------|
| 定价页面加载 | `page.goto("/pricing")` | 显示 3 张定价卡片（Free / Hobby / Pro） |
| 月付支付 Hobby | makeStripePayment({ planId: "hobby", cycle: "monthly" }) | 支付成功，订阅激活 |
| 年付支付 Hobby | makeStripePayment({ planId: "hobby", cycle: "yearly" }) | 支付成功，订阅激活 |
| 月付支付 Pro | makeStripePayment({ planId: "pro", cycle: "monthly" }) | 支付成功，订阅激活 |
| 年付支付 Pro | makeStripePayment({ planId: "pro", cycle: "yearly" }) | 支付成功，订阅激活 |
| 支付后 Manage Subscription | 支付后回到 /pricing | 显示 "Manage Subscription" 按钮 |

---

## 七、通过标准（Acceptance Criteria）

### 7.1 功能验收

- [ ] `/pricing` 页面只显示 Free / Hobby / Pro 三张卡片，**不再有 10 Credits 卡片**
- [ ] 月付/年付 Toggle 可以正常切换，价格正确显示
- [ ] Hobby 月付 $3.99、年付 $9.99；Pro 月付 $6.99、年付 $16.99
- [ ] Free 计划不触发 Checkout Session
- [ ] Hobby/Pro 月付 Checkout Session 包含正确的 `trial_period_days`
- [ ] Hobby/Pro 年付 Checkout Session 包含赠送天数的 `trial_period_days`
- [ ] 支付成功后 ZeroClaw 实例自动开通（Server B 上 systemd 服务 active）
- [ ] 取消订阅后 ZeroClaw 实例自动停止
- [ ] `/account` 页面不显示 "Buy More Credits" 按钮
- [ ] 已有 10 Credits 用户的积分不受影响

### 7.2 技术验收

- [ ] `wasp build` 后端构建成功，无编译错误
- [ ] `vite build` 前端构建成功，无编译错误
- [ ] 所有 E2E 测试通过
- [ ] 代码中不再有对 `PaymentPlanId.Credits10` 的引用
- [ ] `.env.server` 中不再有 `PAYMENTS_CREDITS_10_PLAN_ID`
- [ ] Stripe Webhook 正确处理 `invoice.paid` 和 `customer.subscription.deleted` 事件
- [ ] 生产环境部署后，支付流程端到端可用

### 7.3 兼容性验收

- [ ] 已有 Hobby $9.99 订阅用户不受影响（仍可使用服务）
- [ ] 已有 Pro $19.99 订阅用户不受影响
- [ ] Free 用户仍可使用 3 credits
- [ ] Admin Dashboard 正常显示

---

## 八、Stripe Dashboard 操作清单

在代码改动之前，需要在 Stripe Dashboard（测试模式 + 生产模式各做一次）完成以下操作：

1. **创建/更新产品：**
   - `Amigo Hobby` — 添加两个 Price：
     - Monthly: $3.99/month（recurring）
     - Yearly: $9.99/year（recurring, interval: year）
   - `Amigo Pro` — 添加两个 Price：
     - Monthly: $6.99/month（recurring）
     - Yearly: $16.99/year（recurring, interval: year）

2. **记录 Price ID：**
   ```
   HOBBY_MONTHLY_PRICE_ID=price_xxx
   HOBBY_YEARLY_PRICE_ID=price_xxx
   PRO_MONTHLY_PRICE_ID=price_xxx
   PRO_YEARLY_PRICE_ID=price_xxx
   ```

3. **旧 Price 处理：**
   - 旧的 Hobby ($9.99/mo) 和 Pro ($19.99/mo) Price 可以 **Archive**（归档），不影响已有订阅
   - 旧的 10 Credits Price 也 **Archive**

4. **Webhook 配置：**
   - 确认 Stripe Webhook 仍配置了 `invoice.paid`、`customer.subscription.updated`、`customer.subscription.deleted` 事件

5. **Customer Portal 配置：**
   - 更新 Portal 配置，允许用户在 Hobby/Pro 之间切换
   - 允许用户在月付/年付之间切换

---

## 九、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 旧订阅用户未迁移 | 仍扣旧价格 $9.99/$19.99 | Stripe Portal 引导迁移，或通过 Stripe API 批量迁移 |
| 试用期实现偏差 | Stripe `trial_period_days` 可能与预期行为不一致 | 先在测试模式充分验证 |
| 年付赠送天数计算 | 仅首年赠送，续费不赠送 | `trial_period_days` 仅在首次订阅时生效，续费自动恢复正常周期 |
| 前端月付/年付切换状态丢失 | 页面刷新后重置为月付 | 可用 localStorage 持久化选择，或默认年付（更优惠） |
| `Credits10` 引用遗漏 | 编译或运行时错误 | 全局搜索 `credits10` / `Credits10` 确保清除 |

---

## 十、文件变更清单速查

| 文件 | 操作类型 | Phase |
|------|----------|-------|
| `app/src/payment/plans.ts` | **修改** — 移除 Credits10，支持月付/年付（完整替换见附录 A） | P2.1 |
| `app/.env.server` | **修改** — 更新环境变量 | P2.2 |
| `app/.env.server.example` | **修改** — 更新环境变量 | P2.2 |
| `app/src/payment/operations.ts` | **修改** — 扩展 billingCycle 参数（完整代码见附录 B） | P2.3 |
| `app/src/payment/stripe/checkoutUtils.ts` | **修改** — 添加 trialPeriodDays 参数（完整代码见附录 B） | P2.4 |
| `app/src/payment/stripe/webhook.ts` | **修改** — 移除 Credits10 分支 | P2.5 |
| `app/src/payment/stripe/paymentProcessor.ts` | **修改** — 适配新计划，mode 硬编码 "subscription"，删除死代码 | P2.6 |
| `app/src/payment/paymentProcessor.ts` | **修改** — CreateCheckoutSessionArgs 新增 billingCycle | P2.7 |
| `app/src/payment/user.ts` | **修改** — 删除 updateUserCredits 死代码 | P2.8 |
| `app/src/payment/polar/webhook.ts` | **修改** — 移除 Credits10 分支 | P2.9 |
| `app/src/payment/PricingPage.tsx` | **修改** — 重构 UI（完整规格见附录 C） | P3.1 |
| `app/src/user/AccountPage.tsx` | **修改** — 移除 Buy More Credits | P3.2 |
| `e2e-tests/tests/pricingPageTests.spec.ts` | **修改** — 移除 Credits10 测试 | P4.1 |
| `e2e-tests/tests/utils.ts` | **修改** — 更新 makeStripePayment 类型 | P4.1 |
| Stripe Dashboard | **配置** — 新建 Price | Phase 1 |
| 服务器 docker-compose.yml | **修改** — 更新环境变量 | P5.5 |

---

## 附录 A：plans.ts 数据结构设计（开发者必读）

### 设计决策：方案 A — 枚举不变，PaymentPlan 内部存两个 Price ID

枚举保持 `Hobby` / `Pro` 两个值不变，`PaymentPlan` 结构扩展为包含 `monthly` 和 `yearly` 两个子配置。

### 目标代码（完整替换 plans.ts）

```typescript
import { requireNodeEnvVar } from "../server/utils";

export enum SubscriptionStatus {
  PastDue = "past_due",
  CancelAtPeriodEnd = "cancel_at_period_end",
  Active = "active",
  Deleted = "deleted",
}

export enum PaymentPlanId {
  Hobby = "hobby",
  Pro = "pro",
}

export type BillingCycle = "monthly" | "yearly";

export interface PaymentPlan {
  getPaymentProcessorPlanId: (billingCycle: BillingCycle) => string;
  effect: PaymentPlanEffect;
  trialDays: number;
}

export type PaymentPlanEffect = { kind: "subscription" };

export const paymentPlans = {
  [PaymentPlanId.Hobby]: {
    getPaymentProcessorPlanId: (billingCycle: BillingCycle) => {
      const envVar =
        billingCycle === "monthly"
          ? "PAYMENTS_HOBBY_MONTHLY_PLAN_ID"
          : "PAYMENTS_HOBBY_YEARLY_PLAN_ID";
      return requireNodeEnvVar(envVar);
    },
    effect: { kind: "subscription" },
    trialDays: 30,
  },
  [PaymentPlanId.Pro]: {
    getPaymentProcessorPlanId: (billingCycle: BillingCycle) => {
      const envVar =
        billingCycle === "monthly"
          ? "PAYMENTS_PRO_MONTHLY_PLAN_ID"
          : "PAYMENTS_PRO_YEARLY_PLAN_ID";
      return requireNodeEnvVar(envVar);
    },
    effect: { kind: "subscription" },
    trialDays: 14,
  },
} as const satisfies Record<PaymentPlanId, PaymentPlan>;

export function prettyPaymentPlanName(planId: PaymentPlanId): string {
  const planToName: Record<PaymentPlanId, string> = {
    [PaymentPlanId.Hobby]: "Hobby",
    [PaymentPlanId.Pro]: "Pro",
  };
  return planToName[planId];
}

export function parsePaymentPlanId(planId: string): PaymentPlanId {
  if ((Object.values(PaymentPlanId) as string[]).includes(planId)) {
    return planId as PaymentPlanId;
  } else {
    throw new Error(`Invalid PaymentPlanId: ${planId}`);
  }
}

export function getSubscriptionPaymentPlanIds(): PaymentPlanId[] {
  return Object.values(PaymentPlanId).filter(
    (planId) => paymentPlans[planId].effect.kind === "subscription",
  );
}

export function getPaymentPlanIdByPaymentProcessorPlanId(
  paymentProcessorPlanId: string,
): PaymentPlanId {
  for (const [planId, plan] of Object.entries(paymentPlans)) {
    for (const cycle of ["monthly", "yearly"] as BillingCycle[]) {
      if (plan.getPaymentProcessorPlanId(cycle) === paymentProcessorPlanId) {
        return planId as PaymentPlanId;
      }
    }
  }
  throw new Error(
    `Unknown payment processor plan ID: ${paymentProcessorPlanId}`,
  );
}
```

### 关键变更说明

| 变更点 | 说明 |
|--------|------|
| 移除 `Credits10` 枚举 | 不再存在 |
| 移除 `PaymentPlanEffect` 的 `credits` kind | 不再存在，只保留 `subscription` |
| `getPaymentProcessorPlanId` 签名变更 | 从 `() => string` 改为 `(billingCycle: BillingCycle) => string`，**调用方必须传 billingCycle** |
| 新增 `trialDays` 字段 | 每个计划自带试用期天数（Hobby=30, Pro=14），供 checkoutUtils 使用 |
| `getPaymentPlanIdByPaymentProcessorPlanId` | 遍历月付和年付两个 Price ID 进行匹配 |
| 移除 `updateUserCredits` 相关 | `PaymentPlanEffect` 不再有 `credits` 类型 |

### 环境变量映射

```
PAYMENTS_HOBBY_MONTHLY_PLAN_ID=price_xxx    # Hobby 月付 $3.99/mo
PAYMENTS_HOBBY_YEARLY_PLAN_ID=price_xxx     # Hobby 年付 $9.99/yr
PAYMENTS_PRO_MONTHLY_PLAN_ID=price_xxx      # Pro 月付 $6.99/mo
PAYMENTS_PRO_YEARLY_PLAN_ID=price_xxx       # Pro 年付 $16.99/yr
```

**移除的环境变量：** `PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID`、`PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID`、`PAYMENTS_CREDITS_10_PLAN_ID`

---

## 附录 B：trial_period_days 精确实现（开发者必读）

### 实现方式：Stripe Checkout Session 的 `subscription_data.trial_period_days`

在 `createStripeCheckoutSession` 中，当 `mode === "subscription"` 时，通过 `subscription_data.trial_period_days` 参数设置试用期。

### checkoutUtils.ts 目标代码变更

**当前签名：**
```typescript
interface CreateStripeCheckoutSessionParams {
  priceId: Stripe.Price["id"];
  customerId: Stripe.Customer["id"];
  mode: Stripe.Checkout.Session.Mode;
}
```

**改为：**
```typescript
interface CreateStripeCheckoutSessionParams {
  priceId: Stripe.Price["id"];
  customerId: Stripe.Customer["id"];
  mode: Stripe.Checkout.Session.Mode;
  trialPeriodDays?: number;
}
```

**`createStripeCheckoutSession` 函数体变更：**
```typescript
export function createStripeCheckoutSession({
  priceId,
  customerId,
  mode,
  trialPeriodDays,
}: CreateStripeCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  return stripeClient.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode,
    success_url: `${config.frontendUrl}/checkout?status=success`,
    cancel_url: `${config.frontendUrl}/checkout?status=canceled`,
    automatic_tax: { enabled: true },
    allow_promotion_codes: true,
    customer_update: { address: "auto" },
    invoice_creation: getInvoiceCreationConfig(mode),
    subscription_data:
      mode === "subscription" && trialPeriodDays
        ? { trial_period_days: trialPeriodDays }
        : undefined,
  });
}
```

### trial_period_days 参数值表

| 计划 | 月付 trial_period_days | 年付 trial_period_days |
|------|----------------------|----------------------|
| Hobby | 30 | 30 |
| Pro | 14 | 14 |

### Stripe trial_period_days 行为说明

| 场景 | Stripe 行为 |
|------|------------|
| 月付 + trial_period_days=30 | 用户提交支付信息，前 30 天不扣费。30 天后 Stripe 自动扣首月 $3.99。期间取消不扣款。 |
| 年付 + trial_period_days=30 | 用户提交支付信息，前 30 天不扣费。30 天后 Stripe 自动扣首年 $9.99。首年实际有效期 = 30（trial）+ 365（subscription）= 395 天。续费时不再有 trial，恢复为标准 365 天。 |
| 月付 + trial_period_days=14 | 前 14 天不扣费，之后每月扣 $6.99。 |
| 年付 + trial_period_days=14 | 前 14 天不扣费，之后每年扣 $16.99。首年实际有效期 = 14 + 365 = 379 天。续费恢复 365 天。 |

### 调用链路（end-to-end）

```
PricingPage (用户选 Hobby + Monthly)
  → handleBuyNowClick("hobby", "monthly")
    → generateCheckoutSession({ planId: "hobby", billingCycle: "monthly" })
      → paymentPlans.Hobby.getPaymentProcessorPlanId("monthly") → PAYMENTS_HOBBY_MONTHLY_PLAN_ID
      → paymentPlans.Hobby.trialDays → 30
      → paymentProcessor.createCheckoutSession({ ..., paymentPlan, billingCycle: "monthly" })
        → createStripeCheckoutSession({ priceId, customerId, mode: "subscription", trialPeriodDays: 30 })
          → Stripe Checkout Session 创建，带 trial_period_days=30
```

### paymentProcessor.ts 需要的变更

`stripePaymentProcessor.createCheckoutSession` 的调用需要扩展，传入 `billingCycle` 和 `trialDays`：

```typescript
createCheckoutSession: async ({
  userId,
  userEmail,
  paymentPlan,
  prismaUserDelegate,
}: CreateCheckoutSessionArgs) => {
  // ... ensureStripeCustomer, updateUserPaymentProcessorUserId 不变 ...

  const checkoutSession = await createStripeCheckoutSession({
    customerId: customer.id,
    priceId: paymentPlan.getPaymentProcessorPlanId(billingCycle),
    mode: "subscription",
    trialPeriodDays: paymentPlan.trialDays,
  });
  // ... 不变 ...
},
```

这意味着 `CreateCheckoutSessionArgs` 接口也需要新增 `billingCycle` 字段：

```typescript
export interface CreateCheckoutSessionArgs {
  userId: User["id"];
  userEmail: NonNullable<User["email"]>;
  paymentPlan: PaymentPlan;
  billingCycle: BillingCycle;
  prismaUserDelegate: PrismaClient["user"];
}
```

### operations.ts 需要的变更

```typescript
const generateCheckoutSessionSchema = z.object({
  planId: z.nativeEnum(PaymentPlanId),
  billingCycle: z.enum(["monthly", "yearly"]),
});

export const generateCheckoutSession: GenerateCheckoutSession<
  z.infer<typeof generateCheckoutSessionSchema>,
  CheckoutSession
> = async (rawArgs, context) => {
  // ... auth check 不变 ...
  const { planId, billingCycle } = ensureArgsSchemaOrThrowHttpError(
    generateCheckoutSessionSchema,
    rawArgs,
  );
  // ...
  const paymentPlan = paymentPlans[planId];
  const { session } = await paymentProcessor.createCheckoutSession({
    userId,
    userEmail,
    paymentPlan,
    billingCycle,
    prismaUserDelegate: context.entities.User,
  });
  // ... 不变 ...
};
```

### webhook.ts 不需要额外试用期逻辑

因为 `trial_period_days` 由 Stripe 在 Checkout Session 层面处理，Stripe 会自动：
- 在 trial 期间发送 `customer.subscription.updated`（status=trialing）
- trial 结束后发送 `invoice.paid`（首次扣款）
- `invoice.paid` 中的 `datePaid` 即为 trial 结束后的首次实际付款日期

因此 **C4 中第 4 点的"新增试用期逻辑"可以省略**，webhook 中只需移除 Credits10 分支即可。试用期完全由 Stripe 管理，Server A 不需要记录试用结束时间。

---

## 附录 C：PricingPage Toggle 交互规格（开发者必读）

### 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│            Pick your pricing                                │
│                                                             │
│        [ Monthly ]  [ Yearly ✓ Save 58% ]   ← Toggle      │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │   Free   │  │    Hobby     │  │      Pro  ★Best  │      │
│  │   $0     │  │  $3.99/mo    │  │   $6.99/mo       │      │
│  │          │  │  or $9.99/yr │  │  or $16.99/yr    │      │
│  │ · 3 cr   │  │ · 自带 API   │  │ · 自带 API       │      │
│  │ · 无实例 │  │ · ZC 实例    │  │ · ZC 实例        │      │
│  │          │  │ · 30天试用   │  │ · 14天试用       │      │
│  │[Get     ]│  │ [Buy plan ]  │  │  [Buy plan]      │      │
│  └──────────┘  └──────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Toggle 组件规格

| 属性 | 规格 |
|------|------|
| 组件类型 | 两个 Button 组成的 ButtonGroup（或 shadcn ToggleGroup） |
| 默认选中 | **Monthly**（月付） |
| 选中样式 | `variant="default"`（高亮） |
| 未选中样式 | `variant="outline"` |
| Yearly 按钮文字 | `Yearly` + 副标签 `Save up to 58%`（绿色小字） |
| 持久化 | **不持久化**（页面刷新回到 Monthly），保持简单 |
| 切换行为 | 点击后立即更新 Hobby/Pro 卡片的价格和 `/month` / `/year` 后缀 |
| Free 卡片 | **不受 Toggle 影响**，始终显示 $0 |

### 价格显示逻辑

```typescript
// 根据当前 billingCycle 决定显示内容
const displayPrice = (planId: PaymentPlanId, cycle: BillingCycle) => {
  if (cycle === "monthly") {
    return { price: paymentPlanCards[planId].monthlyPrice, suffix: "/month" };
  } else {
    return { price: paymentPlanCards[planId].yearlyPrice, suffix: "/year" };
  }
};
```

### paymentPlanCards 数据结构

```typescript
interface PaymentPlanCard {
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  description: string;
  features: string[];
}

export const paymentPlanCards: Record<"free" | PaymentPlanId, PaymentPlanCard> = {
  free: {
    name: "Free",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    description: "Try it out",
    features: ["3 credits one-time", "No ZeroClaw instance", "Basic features"],
  },
  [PaymentPlanId.Hobby]: {
    name: "Hobby",
    monthlyPrice: "$3.99",
    yearlyPrice: "$9.99",
    description: "Your own AI agent",
    features: [
      "Bring your own API key",
      "ZeroClaw instance on Server B",
      "30-day free trial (monthly)",
      "Extra 30 days (yearly)",
    ],
  },
  [PaymentPlanId.Pro]: {
    name: "Pro",
    monthlyPrice: "$6.99",
    yearlyPrice: "$16.99",
    description: "Best value for power users",
    features: [
      "Bring your own API key",
      "ZeroClaw instance on Server B",
      "14-day free trial (monthly)",
      "Extra 14 days (yearly)",
    ],
  },
};
```

### 卡片渲染逻辑

```typescript
// 卡片列表 = [Free, Hobby, Pro]
const planOrder: ("free" | PaymentPlanId)[] = ["free", PaymentPlanId.Hobby, PaymentPlanId.Pro];

planOrder.forEach((planKey) => {
  const card = paymentPlanCards[planKey];

  if (planKey === "free") {
    // Free 卡片：价格固定 $0，不受 Toggle 影响
    // 按钮：
    //   - 未登录 → "Get Started" → navigate("/signup")
    //   - 已登录 + Free → "Current Plan" disabled
    //   - 已登录 + 订阅 → 不显示（或显示 "Current Plan: Hobby/Pro"）
  } else {
    // Hobby/Pro 卡片：价格随 Toggle 变化
    const cycle: BillingCycle = /* Toggle state */ "monthly";
    const price = cycle === "monthly" ? card.monthlyPrice : card.yearlyPrice;
    const suffix = cycle === "monthly" ? "/month" : "/year";

    // 按钮：
    //   - 未登录 → "Log in to buy plan" → navigate("/login")
    //   - 已登录 + 无订阅 → "Buy plan" → handleBuyNowClick(planKey, cycle)
    //   - 已登录 + 有订阅 → "Manage Subscription" → handleCustomerPortalClick()
  }
});
```

### handleBuyNowClick 变更

```typescript
async function handleBuyNowClick(
  paymentPlanId: PaymentPlanId,
  billingCycle: BillingCycle,
) {
  if (!user) {
    navigate("/login");
    return;
  }
  try {
    setIsPaymentLoading(true);
    const checkoutResults = await generateCheckoutSession({
      planId: paymentPlanId,
      billingCycle,
    });
    if (checkoutResults?.sessionUrl) {
      window.open(checkoutResults.sessionUrl, "_self");
    } else {
      throw new Error("Error generating checkout session URL");
    }
  } catch (error: unknown) {
    // ... error handling 不变 ...
  }
}
```

### 折扣百分比计算

| 计划 | 月付 × 12 | 年付 | 节省 | 折扣比 |
|------|----------|------|------|--------|
| Hobby | $3.99 × 12 = $47.88 | $9.99 | $37.89 | 79% |
| Pro | $6.99 × 12 = $83.88 | $16.99 | $66.89 | 80% |

Toggle 副标签统一显示 `Save up to 80%`（取两者中较小的折扣比，即 79% 约为 "up to 80%"）。

### "Save" 标签样式

```
┌────────────────┐
│   Yearly       │
│ Save up to 80% │  ← text-xs text-green-600 dark:text-green-400
└────────────────┘
```

### 注意事项

1. `bestDealPaymentPlanId` 改为 `PaymentPlanId.Pro`（保持不变，Pro 仍标记为 "Best Deal"）
2. Free 卡片的 CardFooter 按钮逻辑不同于 Hobby/Pro，需要单独处理
3. Hobby/Pro 卡片的 features 列表是静态的（不随 Toggle 变化），只有价格和后缀变化
4. 已订阅用户的 "Manage Subscription" 按钮行为不变（跳转 Stripe Portal）
5. PricingPage 中当前的描述段落（"Choose between Stripe, LemonSqueezy or Polar... test credit card 4242..."）应更新为 Amigo 品牌文案，移除技术细节（支付处理器选择、测试卡号）

---

## 附录 D：跨文件变更清单（开发者必读）

### D1. BillingCycle import 变更

`BillingCycle` 类型在 `plans.ts` 中新增，以下文件需要新增 import：

| 文件 | 需要的 import | 说明 |
|------|--------------|------|
| `app/src/payment/operations.ts` | `import { ..., BillingCycle } from "./plans"` | 函数签名和 Zod schema 中使用 |
| `app/src/payment/paymentProcessor.ts` | `import { ..., BillingCycle } from "./plans"` | `CreateCheckoutSessionArgs` 接口新增字段 |
| `app/src/payment/stripe/paymentProcessor.ts` | 不直接 import | 通过 `paymentPlan.getPaymentProcessorPlanId(billingCycle)` 间接使用，类型由上游传入 |
| `app/src/payment/stripe/checkoutUtils.ts` | 不需要 import | `trialPeriodDays` 是 `number`，不涉及 BillingCycle |
| `app/src/payment/PricingPage.tsx` | `import { ..., BillingCycle } from "./plans"` | Toggle state 类型和 handleBuyNowClick 参数 |

### D2. 移除 Credits10 相关 import

以下文件中有对 `Credits10` 的直接引用，移除枚举值后**必须同步修改**，否则编译报错：

| 文件 | 引用位置 | 修改方式 |
|------|----------|----------|
| `app/src/payment/plans.ts` | 枚举定义、paymentPlans、prettyPaymentPlanName | 直接按附录 A 整体替换 |
| `app/src/payment/PricingPage.tsx` | paymentPlanCards 对象中 Credits10 键 | 移除整个 Credits10 卡片配置 |
| `app/src/payment/stripe/webhook.ts` | `case PaymentPlanId.Credits10:` (Line 114) | 删除整个 case 块 |
| `app/src/payment/polar/webhook.ts` | `case PaymentPlanId.Credits10:` (Line 92) | 删除整个 case 块 |
| `e2e-tests/tests/pricingPageTests.spec.ts` | `const planId = "credits10"` (Line 82) | 删除整个测试用例 |
| `e2e-tests/tests/utils.ts` | 类型 `"hobby" \| "pro" \| "credits10"` (Line 94) 和 `if (planId === "credits10")` (Line 130) | 更新类型定义，移除 credits10 分支 |

### D3. 死代码清理

移除 Credits10 后，以下函数/代码变为无调用方，**应删除**以避免 lint 警告：

| 文件 | 函数/代码 | 原因 |
|------|----------|------|
| `app/src/payment/user.ts` | `updateUserCredits()` + `UpdateUserCreditsArgs` 接口 | 唯一调用方（stripe/webhook.ts 和 polar/webhook.ts 的 Credits10 分支）已移除 |
| `app/src/payment/stripe/paymentProcessor.ts` | `paymentPlanEffectToStripeCheckoutSessionMode()` 函数 | `mode` 永远是 `"subscription"`（不再有 `"payment"`），函数可删除，调用处直接写 `mode: "subscription"` |
| `app/src/payment/stripe/checkoutUtils.ts` | `getInvoiceCreationConfig()` 函数 | `mode` 永远是 `"subscription"`，函数永远返回 `undefined`，可删除。调用处直接写 `invoice_creation: undefined` 或省略 |
| `app/src/payment/plans.ts` | `PaymentPlanEffect` 联合类型中的 `credits` 分支 | 只保留 `{ kind: "subscription" }`，可简化为单一类型（见附录 A） |

### D4. 环境变量文件变更完整清单

**`app/.env.server` — 移除以下行：**
```
PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID=...
PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID=...
PAYMENTS_CREDITS_10_PLAN_ID=...
```

**`app/.env.server` — 新增以下行（值从 Stripe Dashboard 获取）：**
```
PAYMENTS_HOBBY_MONTHLY_PLAN_ID=price_xxx
PAYMENTS_HOBBY_YEARLY_PLAN_ID=price_xxx
PAYMENTS_PRO_MONTHLY_PLAN_ID=price_xxx
PAYMENTS_PRO_YEARLY_PLAN_ID=price_xxx
```

**`app/.env.server.example` — 同步更新**（示例值用 `price_xxx` 占位）

### D5. lemonSqueezy 目录说明

已确认 `app/src/payment/lemonSqueezy/` 目录下无 Credits10 引用，**不需要修改**。
