# Pricing 改版 — AI 开发者任务清单

> **配套文档:** `dev_doc/PRICING_REDESIGN.md`（v1.2）
>
> **总步骤数:** 12 步（P2.1 ~ P3.3），按依赖顺序执行
>
> **前置条件:** Stripe Dashboard 已创建 4 个 Price 并获得 Price ID（见需求文档第八节）

结构：1 个总控提示词 + 12 个步骤（Step 1-12），每步含任务描述、具体要求、验收 Checklist。预估总执行时间约 37 分钟（AI 开发者实际耗时）。

可以分 3 次会话执行来节省 token：

会话 1: Step 1-8（后端，~16 min）
会话 2: Step 9-10（前端，~12 min）
会话 3: Step 11-12（测试+构建，~8 min）

---

## 总控提示词

将以下内容作为系统提示或会话开头，提供给 AI 开发者：

```
你是一个 TypeScript/React 后端开发者。你将按照 dev_doc/PRICING_REDESIGN.md 文档执行
Pricing 改版任务。每个步骤有明确的输入文件、改动要求和验收标准。

核心约束：
1. 严格按步骤顺序执行，每个步骤完成后运行验收检查，通过后再进入下一步
2. 不修改文档中标注为 "Out of Scope" 的文件
3. 所有代码改动不能破坏现有功能（Hobby/Pro 订阅 → ZeroClaw 自动开通的链路）
4. 不添加任何注释（代码中已有的注释可以保留或删除，不新增）
5. 使用项目已有的库和组件（shadcn/ui + Tailwind CSS + Stripe SDK + Zod + Wasp）
6. 每个步骤完成后，运行 npx tsc --noEmit 检查类型错误（workdir: app/）
7. 遇到文档中未覆盖的情况，按最小改动原则处理，并在完成后说明

改动涉及的文件（共 14 个）：
后端: plans.ts, operations.ts, paymentProcessor.ts, stripe/paymentProcessor.ts,
      stripe/checkoutUtils.ts, stripe/webhook.ts, polar/webhook.ts, user.ts,
      .env.server, .env.server.example
前端: PricingPage.tsx, AccountPage.tsx
测试: pricingPageTests.spec.ts, utils.ts

需求文档路径: dev_doc/PRICING_REDESIGN.md
附录 A (plans.ts 目标代码): 文档第 419-533 行
附录 B (trial_period_days 实现): 文档第 539-693 行
附录 C (PricingPage 交互规格): 文档第 697-898 行
附录 D (跨文件变更清单): 文档第 913-970 行
```

---

## Step 1: plans.ts — 计划定义重构

### 任务

替换 `app/src/payment/plans.ts` 的全部内容为需求文档附录 A 中的目标代码（文档第 427-512 行）。

### 具体要求

1. 移除 `Credits10` 枚举值
2. 移除 `PaymentPlanEffect` 的 `credits` kind，只保留 `{ kind: "subscription" }`
3. `getPaymentProcessorPlanId` 签名改为 `(billingCycle: BillingCycle) => string`
4. 新增 `BillingCycle` 类型：`"monthly" | "yearly"`
5. 新增 `trialDays` 字段（Hobby=30, Pro=14）
6. `getPaymentPlanIdByPaymentProcessorPlanId` 遍历月付+年付两组 Price ID 匹配
7. 完整替换，不要部分修改

### 验收标准

- [ ] 文件中不存在 `Credits10`、`credits10`、`PAYMENTS_CREDITS_10_PLAN_ID`
- [ ] 文件中不存在 `{ kind: "credits"; amount: number }`
- [ ] `BillingCycle` 类型已导出
- [ ] `PaymentPlan` 接口包含 `trialDays: number`
- [ ] `cd app && npx tsc --noEmit` 无报错（可能有其他文件报错，确认报错不含 plans.ts 自身）

---

## Step 2: .env.server + .env.server.example — 环境变量更新

### 任务

更新环境变量文件，移除旧变量，添加新的月付/年付变量。

### 具体要求

**`app/.env.server` — 移除：**
- `PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID`
- `PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID`
- `PAYMENTS_CREDITS_10_PLAN_ID`

**`app/.env.server` — 新增（值暂时留空或用占位符，等 Stripe Dashboard 配置后填入）：**
```
PAYMENTS_HOBBY_MONTHLY_PLAN_ID=
PAYMENTS_HOBBY_YEARLY_PLAN_ID=
PAYMENTS_PRO_MONTHLY_PLAN_ID=
PAYMENTS_PRO_YEARLY_PLAN_ID=
```

**`app/.env.server.example` — 同步更新**，示例值用 `price_xxx` 占位。

### 验收标准

- [ ] `.env.server` 中不含 `PAYMENTS_CREDITS_10_PLAN_ID`、`PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID`、`PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID`
- [ ] `.env.server` 中包含 4 个新的 `PAYMENTS_*_MONTHLY/YEARLY_PLAN_ID`
- [ ] `.env.server.example` 与 `.env.server` 结构一致

---

## Step 3: operations.ts — 支付操作扩展 billingCycle

### 任务

修改 `app/src/payment/operations.ts`，让 `generateCheckoutSession` 接收 `{ planId, billingCycle }` 而非单个 `PaymentPlanId`。

### 具体要求

参考需求文档附录 B 的 operations.ts 部分（文档第 658-683 行）：

1. 新增 import：从 `../payment/plans` 导入 `BillingCycle`（追加到已有 import）
2. Zod Schema 从 `z.nativeEnum(PaymentPlanId)` 改为：
   ```typescript
   const generateCheckoutSessionSchema = z.object({
     planId: z.nativeEnum(PaymentPlanId),
     billingCycle: z.enum(["monthly", "yearly"]),
   });
   ```
3. 函数泛型类型从 `GenerateCheckoutSession<z.infer<typeof ...>, CheckoutSession>` 保持不变（schema 变了，推断类型自动变）
4. 解构 `{ planId, billingCycle }` 替代原来的 `paymentPlanId`
5. `paymentPlans[planId]` 替代 `paymentPlans[paymentPlanId]`
6. `createCheckoutSession` 调用中新增 `billingCycle` 参数
7. `ensureArgsSchemaOrThrowHttpError` 调用不变

### 验收标准

- [ ] `generateCheckoutSessionSchema` 是 `z.object({ planId, billingCycle })`
- [ ] 函数中不存在旧的 `rawPaymentPlanId` 变量名
- [ ] `paymentProcessor.createCheckoutSession` 传入了 `billingCycle`
- [ ] `cd app && npx tsc --noEmit` 中 operations.ts 相关报错可暂时忽略（因 paymentProcessor.ts 接口尚未更新，Step 5 会修复）

---

## Step 4: checkoutUtils.ts — 添加 trialPeriodDays 支持

### 任务

修改 `app/src/payment/stripe/checkoutUtils.ts`，支持 `trial_period_days` 参数。

### 具体要求

参考需求文档附录 B 的 checkoutUtils.ts 部分（文档第 557-589 行）：

1. `CreateStripeCheckoutSessionParams` 接口新增 `trialPeriodDays?: number`
2. `createStripeCheckoutSession` 函数解构新增 `trialPeriodDays`
3. `stripeClient.checkout.sessions.create` 调用中新增：
   ```typescript
   subscription_data:
     mode === "subscription" && trialPeriodDays
       ? { trial_period_days: trialPeriodDays }
       : undefined,
   ```
4. **删除** `getInvoiceCreationConfig` 函数（不再需要，mode 永远是 subscription）
5. 调用处 `invoice_creation: getInvoiceCreationConfig(mode)` 直接改为 `invoice_creation: undefined` 或直接删除该行
6. 不修改 `ensureStripeCustomer` 函数

### 验收标准

- [ ] `CreateStripeCheckoutSessionParams` 包含 `trialPeriodDays?: number`
- [ ] `getInvoiceCreationConfig` 函数已删除
- [ ] `subscription_data` 条件逻辑正确（mode === "subscription" && trialPeriodDays）
- [ ] 文件中不引用任何已删除的函数

---

## Step 5: paymentProcessor.ts（根目录）— 接口新增 billingCycle

### 任务

修改 `app/src/payment/paymentProcessor.ts`，在 `CreateCheckoutSessionArgs` 接口中新增 `billingCycle` 字段。

### 具体要求

参考需求文档附录 B（文档第 647-653 行）：

1. 新增 import：从 `./plans` 导入 `BillingCycle`（追加到已有 import）
2. `CreateCheckoutSessionArgs` 接口新增 `billingCycle: BillingCycle`
3. 其他接口和类型不变
4. `paymentProcessor` 的赋值不变

### 验收标准

- [ ] `CreateCheckoutSessionArgs` 包含 `billingCycle: BillingCycle`
- [ ] `BillingCycle` 已从 `./plans` 导入
- [ ] `FetchCustomerPortalUrlArgs` 不变

---

## Step 6: stripe/paymentProcessor.ts — 适配新计划 + 删除死代码

### 任务

修改 `app/src/payment/stripe/paymentProcessor.ts`，传入 billingCycle 和 trialPeriodDays，并删除不再需要的工具函数。

### 具体要求

参考需求文档附录 B（文档第 625-641 行）：

1. `createCheckoutSession` 方法体内：
   - `createStripeCheckoutSession` 调用中，`priceId` 改为 `paymentPlan.getPaymentProcessorPlanId(args.billingCycle)`
   - `mode` 从 `paymentPlanEffectToStripeCheckoutSessionMode(paymentPlan.effect)` 改为硬编码 `"subscription"`
   - 新增 `trialPeriodDays: paymentPlan.trialDays`
2. **删除** `paymentPlanEffectToStripeCheckoutSessionMode` 整个函数
3. 移除对 `assertUnreachable` 的 import（如果该 import 仅被删除的函数使用）
4. 其他方法（`fetchCustomerPortalUrl`）不变

### 验收标准

- [ ] `paymentPlanEffectToStripeCheckoutSessionMode` 函数已删除
- [ ] `createStripeCheckoutSession` 传入 `trialPeriodDays: paymentPlan.trialDays`
- [ ] `mode` 硬编码为 `"subscription"`
- [ ] `priceId` 使用 `paymentPlan.getPaymentProcessorPlanId(args.billingCycle)`
- [ ] `cd app && npx tsc --noEmit` 中此文件无报错

---

## Step 7: stripe/webhook.ts — 移除 Credits10 分支

### 任务

修改 `app/src/payment/stripe/webhook.ts`，移除 Credits10 相关逻辑。

### 具体要求

1. **删除** `handleInvoicePaid` 中 `case PaymentPlanId.Credits10:` 整个 case 块（约 Line 114-122）
2. **移除** import 中的 `updateUserCredits`（只保留 `updateUserSubscription`）
3. `case PaymentPlanId.Pro:` 和 `case PaymentPlanId.Hobby:` 合并为一个 case 块（已有的大括号结构保持不变）
4. `default: assertUnreachable(paymentPlanId)` **保留**，不删除
5. 其他函数（`handleCustomerSubscriptionDeleted`、`handleCustomerSubscriptionUpdated`、`constructStripeEvent` 等）不变

### 验收标准

- [ ] 文件中不存在 `Credits10`、`credits10`
- [ ] 文件中不存在 `updateUserCredits`
- [ ] `assertUnreachable` 仍在 switch default 中
- [ ] Hobby/Pro 的 `provisionZeroclawJob.submit` 逻辑不变
- [ ] `handleCustomerSubscriptionDeleted` 中 ZeroClaw 停用逻辑不变

---

## Step 8: polar/webhook.ts + user.ts — 清理遗留引用

### 任务

修改两个文件，清除 Credits10 遗留代码。

### 8a: `app/src/payment/polar/webhook.ts`

1. 删除 `case PaymentPlanId.Credits10:` 整个 case 块（约 Line 92-93）
2. 移除 import 中的 `updateUserCredits`（只保留 `updateUserSubscription`）

### 8b: `app/src/payment/user.ts`

1. **删除** `UpdateUserCreditsArgs` 接口（约 Line 68-73）
2. **删除** `updateUserCredits` 函数（约 Line 74-91）
3. 保留其他所有内容：`fetchUserPaymentProcessorUserId`、`updateUserPaymentProcessorUserId`、`UpdateUserPaymentProcessorUserIdArgs`、`updateUserSubscription`、`UpdateUserSubscriptionArgs`

### 验收标准

- [ ] `polar/webhook.ts` 中不存在 `Credits10`、`updateUserCredits`
- [ ] `user.ts` 中不存在 `updateUserCredits`、`UpdateUserCreditsArgs`
- [ ] `user.ts` 中 `updateUserSubscription` 保持不变
- [ ] `cd app && npx tsc --noEmit` 全部通过（至此所有后端改动完成，不应有类型错误）

---

## Step 9: PricingPage.tsx — 定价页面 UI 重构

### 任务

重写 `app/src/payment/PricingPage.tsx`，实现 Free/Hobby/Pro 三档 + 月付/年付 Toggle。

### 具体要求

参考需求文档附录 C（文档第 697-898 行）：

1. **新增 import：** 从 `./plans` 导入 `BillingCycle`
2. **新增 state：** `const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")`
3. **重写 `paymentPlanCards` 数据结构：** 从 `Record<PaymentPlanId, ...>` 改为 `Record<"free" | PaymentPlanId, ...>`，每个卡片含 `monthlyPrice` + `yearlyPrice`
4. **卡片渲染顺序：** `["free", PaymentPlanId.Hobby, PaymentPlanId.Pro]`
5. **Free 卡片：**
   - 价格始终显示 $0，不受 Toggle 影响
   - 未登录 → "Get Started" 按钮 → `navigate("/signup")`
   - 已登录 + Free → "Current Plan" 按钮，disabled
   - 已登录 + 已订阅 → "Current Plan" 按钮，disabled
6. **Hobby/Pro 卡片：**
   - 价格根据 `billingCycle` 切换 `monthlyPrice` / `yearlyPrice`
   - 后缀根据 `billingCycle` 切换 "/month" / "/year"
   - `bestDealPaymentPlanId` 保持 `PaymentPlanId.Pro`
   - 按钮逻辑与原代码相同（未登录 → "Log in to buy plan"，已登录无订阅 → "Buy plan"，已订阅 → "Manage Subscription"）
7. **Toggle 组件：** 两个 Button，默认选中 Monthly，切换时更新 `billingCycle` state
8. **Yearly 按钮副标签：** "Save up to 80%"，`text-xs text-green-600 dark:text-green-400`
9. **`handleBuyNowClick` 签名：** 改为 `(paymentPlanId: PaymentPlanId, billingCycle: BillingCycle)`，传入 `generateCheckoutSession({ planId: paymentPlanId, billingCycle })`
10. **移除** 原 Credits10 卡片配置
11. **更新** 页面描述段落，移除 "Choose between Stripe, LemonSqueezy..." 和测试卡号等技术细节，改为 Amigo 品牌文案
12. **features 列表内容：** 按附录 C 中的 `paymentPlanCards` 定义，使用英文

### 验收标准

- [ ] 文件中不存在 `Credits10`、`credits10`
- [ ] `billingCycle` state 默认值为 `"monthly"`
- [ ] Free 卡片始终显示 $0，不受 Toggle 影响
- [ ] Toggle 切换时 Hobby/Pro 价格正确变化
- [ ] `handleBuyNowClick` 传入 `{ planId, billingCycle }`
- [ ] 不再引用 `paymentPlans[planId].effect.kind === "subscription"` 来判断后缀（统一用 billingCycle）
- [ ] `cd app && npx tsc --noEmit` 无报错

---

## Step 10: AccountPage.tsx — 移除 Buy More Credits

### 任务

修改 `app/src/user/AccountPage.tsx`，移除积分购买入口。

### 具体要求

1. **删除** `BuyMoreButton` 组件（约 Line 177-194）
2. **删除** Credits 区域中的 "Buy More Credits" 按钮（约 Line 79-81 的 `<BuyMoreButton>` 调用及其父 `<div>`）
3. Credits 区域只保留标签和数值：`{user.credits} credits`
4. 移除不再需要的 import（`WaspRouterLink`、`routes`，如果仅 BuyMoreButton 使用的话）
5. `UserCurrentSubscriptionPlan` 和 `CustomerPortalButton` 不变

### 验收标准

- [ ] 文件中不存在 `BuyMoreButton`、`Buy More Credits`
- [ ] Credits 区域只显示数字，无按钮
- [ ] `CustomerPortalButton` 和 `UserCurrentSubscriptionPlan` 功能不变
- [ ] `cd app && npx tsc --noEmit` 无报错

---

## Step 11: E2E 测试更新

### 任务

更新 E2E 测试文件，移除 Credits10 相关测试，适配新的定价结构。

### 11a: `e2e-tests/tests/utils.ts`

1. `makeStripePayment` 的 `planId` 参数类型从 `"hobby" | "pro" | "credits10"` 改为 `"hobby" | "pro"`
2. 新增 `billingCycle` 参数：`billingCycle?: "monthly" | "yearly"`（默认 `"monthly"`）
3. 删除 `if (planId === "credits10")` 分支（Line 130-132）和 else 中的 credits 相关断言
4. 验证断言统一为：`await expect(page.getByText(planId)).toBeVisible()`
5. 按钮定位逻辑适配新 UI：由于 Free 卡片新增，原来的 `.first()` 选择器可能需要调整

### 11b: `e2e-tests/tests/pricingPageTests.spec.ts`

1. **删除** 整个 "Make test payment with Stripe for 10 credits" 测试用例（约 Line 79-84）
2. 更新 "User should see Log In to Buy Plan button" 测试：3 张卡片变为 3 张（Free 不触发 "Log in to buy plan"），`.first()` 改为定位 Hobby 或 Pro 的按钮
3. 更新 "User should see the Buy Plan button before payment" 测试：同上
4. "Make test payment with Stripe for hobby plan" 保持不变
5. "User should see the Manage Subscription button after payment" 保持不变

### 验收标准

- [ ] `utils.ts` 中不存在 `credits10`
- [ ] `pricingPageTests.spec.ts` 中不存在 `credits10`
- [ ] `makeStripePayment` 接受 `billingCycle` 可选参数
- [ ] 测试文件无 TypeScript 语法错误

---

## Step 12: 构建验证 + 全局清理检查

### 任务

执行构建验证，并做最终的代码清理检查。

### 具体要求

1. **运行 TypeScript 检查：** `cd app && npx tsc --noEmit`，确保零错误
2. **运行全局搜索：** 在 `app/src/` 和 `e2e-tests/` 中搜索以下关键词，确认无遗漏：
   - `Credits10`
   - `credits10`
   - `CREDITS_10`
   - `PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID`（旧变量名）
   - `PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID`（旧变量名）
   - `getInvoiceCreationConfig`（已删除的函数）
   - `paymentPlanEffectToStripeCheckoutSessionMode`（已删除的函数）
   - `updateUserCredits`（已删除的函数）
3. **运行 Wasp 构建：** `cd app && wasp build`
4. **运行 Vite 构建：** `cd app && REACT_APP_API_URL=https://api.agentkm.com npx vite build`

### 验收标准

- [ ] `npx tsc --noEmit` 零错误
- [ ] 全局搜索上述 8 个关键词，结果仅出现在 `dev_doc/` 文档中（代码文件中无残留）
- [ ] `wasp build` 成功
- [ ] `vite build` 成功

### 构建成功后

将构建结果 commit 并 push：

```bash
cd /root/opencode/my-saas-app_20260327
git add -A
git commit -m "refactor: pricing redesign - remove Credits10, add monthly/yearly billing with trial"
git push origin main
```

然后等待 1Panel 自动部署到生产环境。

---

## 执行摘要

| Step | 文件 | 改动类型 | 预估耗时 |
|------|------|----------|----------|
| 1 | plans.ts | 整体替换 | 2 min |
| 2 | .env.server + .env.server.example | 增删环境变量 | 1 min |
| 3 | operations.ts | 修改函数签名 | 3 min |
| 4 | stripe/checkoutUtils.ts | 新增参数 + 删函数 | 3 min |
| 5 | paymentProcessor.ts | 新增接口字段 | 1 min |
| 6 | stripe/paymentProcessor.ts | 适配 + 删死代码 | 3 min |
| 7 | stripe/webhook.ts | 删 case 分支 | 2 min |
| 8 | polar/webhook.ts + user.ts | 删遗留代码 | 2 min |
| 9 | PricingPage.tsx | 大幅重写 | 10 min |
| 10 | AccountPage.tsx | 删按钮 | 2 min |
| 11 | e2e tests (2 files) | 适配新结构 | 3 min |
| 12 | 构建 + 全局检查 | 验证 | 5 min |
| **总计** | **14 个文件** | | **~37 min** |
