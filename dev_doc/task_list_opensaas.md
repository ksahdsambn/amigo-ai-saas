# Server A 任务清单 · OpenSaaS 代码改动

> **目标：** 在现有 Wasp OpenSaaS 项目中添加 ZeroClaw 实例自动开通能力
>
> **约束：** 仅修改本项目 (`/root/opencode/my-saas-app_20260327/app/`) 下的代码
>
> **参考文档：** `dev_doc/DEPLOYMENT_PLAN.md`

---

## 任务总览

| 阶段 | 任务数 | 依赖 |
|------|--------|------|
| T1 数据层 | 1 | 无 |
| T2 后端核心模块 | 3 | T1 |
| T3 业务集成 | 2 | T2 |
| T4 前端页面 | 1 | T3 |
| T5 Wasp 声明注册 | 1 | T2 + T4 |
| T6 环境变量与部署 | 1 | T5 |
| T7 集成验证 | 1 | T6 |

---

## T1 · 数据库 Schema 变更

### T1.1 修改 `schema.prisma`，新增 ZeroclawInstance 模型

**文件：** `app/schema.prisma`

**操作：** 修改

**具体要求：**

1. 在 `User` 模型末尾添加一个 one-to-one 关联字段：

   - 字段名：`zeroclawInstance`
   - 类型：`ZeroclawInstance?`
   - 无需 @relation 的 fields/references（由对面持有）

2. 在文件末尾新增 `ZeroclawInstance` 模型，包含以下字段：

   | 字段名 | 类型 | 属性 | 说明 |
   |--------|------|------|------|
   | id | String | @id @default(uuid()) | 主键 |
   | createdAt | DateTime | @default(now()) | 创建时间 |
   | updatedAt | DateTime | @updatedAt | 更新时间 |
   | userId | String | @unique | 关联 User.id |
   | user | User | @relation(fields: [userId], references: [id]) | 反向关联 |
   | instanceId | String | @unique | 实例标识，如 "u001" |
   | numericId | Int | @unique | 数字编号，用于端口计算 |
   | status | String | @default("provisioning") | provisioning/active/stopped/suspended/failed/deleting |
   | port | Int | — | 分配的端口号 |
   | dashboardUrl | String? | — | 用户访问 Dashboard 的完整 URL |
   | pathPrefix | String | — | Nginx 路径前缀，如 "/u001" |
   | provider | String | @default("openrouter") | 用户选择的 LLM Provider |
   | userApiKeyEncrypted | String? | — | 用户 LLM API Key（加密存储） |
   | zeroclawVersion | String? | — | ZeroClaw 版本号 |
   | lastHealthCheck | DateTime? | — | 最后健康检查时间 |
   | provisioningError | String? | — | 开通失败错误信息 |
   | subscriptionPlan | String? | — | 关联的订阅计划 |

3. 在 User 模型中添加关联声明：

   - `zeroclawInstance ZeroclawInstance?`

**完成后执行迁移：**

```
cd app && npx prisma migrate dev --name add_zeroclaw_instance
```

**验证标准：**
- `npx prisma generate` 无报错
- `npx prisma migrate dev` 成功创建迁移文件
- 数据库中出现 `ZeroclawInstance` 表

---

## T2 · 后端核心模块（3 个新文件）

### T2.1 新建 `src/zeroclaw/portAllocator.ts` — 端口分配器

**文件：** `app/src/zeroclaw/portAllocator.ts`

**操作：** 新建

**依赖的现有模块：** `@prisma/client`（项目中已使用 Prisma）

**具体要求：**

导出一个异步函数 `allocatePort`：

- 从环境变量读取 `ZEROCLOW_BASE_PORT`（默认 42618）和 `ZEROCLOW_MAX_PORT`（默认 65535）
- 查询 ZeroclawInstance 表中所有 status ≠ "deleting" 的记录的 numericId
- 找到最小未被使用的 numericId（从 1 开始递增）
- 返回 `{ port: BASE_PORT + numericId - 1, numericId }`
- 如果端口耗尽，抛出 Error

**注意：** 使用 Wasp 的方式获取 Prisma Client（通过 context 参数或直接 import）。参考现有文件 `src/analytics/stats.ts` 中 Prisma 的使用方式。

**验证标准：**
- 函数导出正确
- 逻辑：当已有 numericId [1,2,4] 时，应返回 3
- 逻辑：当已有 numericId [1,2,3] 时，应返回 4

---

### T2.2 新建 `src/zeroclaw/provisioning.ts` — Server B API 客户端

**文件：** `app/src/zeroclaw/provisioning.ts`

**操作：** 新建

**依赖：** Node.js 内置 `crypto` 模块，全局 `fetch`

**具体要求：**

1. 从环境变量读取 `SERVER_B_API_URL` 和 `SERVER_B_API_KEY`

2. 实现一个内部辅助函数 `hmacSign`：
   - 接收 timestamp (string) 和 secret (string)
   - 返回 HMAC-SHA256 签名的 hex 字符串
   - 使用 `crypto.createHmac('sha256', secret).update(timestamp).digest('hex')`

3. 实现一个内部辅助函数 `makeRequest`：
   - 接收 method、path、body（可选）
   - 自动生成 timestamp 和 signature
   - 设置请求头：`Content-Type: application/json`、`X-Timestamp`、`X-Signature`
   - 发送请求到 `${SERVER_B_API_URL}${path}`
   - 非成功状态码时抛出 Error（包含 status 和 response body）

4. 导出以下 4 个异步函数：

   **`provisionInstance(opts)`**
   - 入参：`{ userId, instanceId, numericId, port, pathPrefix }`
   - 调用 `POST /api/provision`，body 为这些参数
   - 返回 `{ success: boolean, dashboardUrl: string }`

   **`deprovisionInstance(instanceId)`**
   - 入参：`instanceId: string`
   - 调用 `POST /api/deprovision`，body 为 `{ instanceId }`
   - 无返回值

   **`getInstanceStatus(instanceId)`**
   - 入参：`instanceId: string`
   - 调用 `GET /api/instances/${instanceId}`
   - 返回 JSON 对象或 null（404 时）

   **`updateInstanceApiKey(instanceId, provider, apiKey)`**
   - 入参：`instanceId: string`, `provider: string`, `apiKey: string`
   - 调用 `POST /api/instances/${instanceId}/config`，body 为 `{ provider, apiKey }`
   - 无返回值

**验证标准：**
- 所有 4 个函数正确导出
- HMAC 签名逻辑正确
- 环境变量缺失时有明确报错

---

### T2.3 新建 `src/zeroclaw/provisioningJob.ts` — PgBoss 异步开通 Job

**文件：** `app/src/zeroclaw/provisioningJob.ts`

**操作：** 新建

**依赖：** T2.1 的 `allocatePort`，T2.2 的 `provisionInstance`

**具体要求：**

1. 定义类型 `ProvisionJobArgs = { userId: string }`

2. 导出异步函数 `provisionZeroclawForUser`：
   - 入参：`{ userId }` （PgBoss job payload 格式）
   - **注意 Wasp Job 的函数签名：** 参考 `src/analytics/stats.ts` 中 `calculateDailyStats` 的写法，第一个参数是 job payload

3. 函数内部流程：
   - 步骤 a：查询该 userId 是否已有 ZeroclawInstance（且 status ≠ "failed"），如有则跳过（幂等）
   - 步骤 b：调用 `allocatePort()` 获取 `{ port, numericId }`
   - 步骤 c：计算 `instanceId = "u" + String(numericId).padStart(3, "0")`
   - 步骤 d：计算 `pathPrefix = "/" + instanceId`
   - 步骤 e：计算 `dashboardUrl = process.env.ZEROCLOW_DASHBOARD_BASE_URL + pathPrefix + "/"`
   - 步骤 f：使用 Prisma upsert 创建/更新 ZeroclawInstance 记录，status = "provisioning"
   - 步骤 g：调用 `provisionInstance(...)` 通知 Server B
   - 步骤 h（成功）：更新 ZeroclawInstance，status = "active"，填入 dashboardUrl 和 lastHealthCheck
   - 步骤 h（失败）：更新 ZeroclawInstance，status = "failed"，填入 provisioningError，然后 re-throw（让 PgBoss 重试）

4. Prisma Client 获取方式参考 `src/analytics/stats.ts`

**验证标准：**
- 幂等性：同一 userId 调用两次不会创建两条记录
- 失败时正确记录错误并抛出异常
- 环境变量 `ZEROCLOW_DASHBOARD_BASE_URL` 被正确使用

---

## T3 · 业务集成（修改 2 个现有文件）

### T3.1 修改 `src/payment/stripe/webhook.ts` — 支付成功触发开通

**文件：** `app/src/payment/stripe/webhook.ts`

**操作：** 修改

**具体要求：**

**改动点 1：在 `handleInvoicePaid` 函数中（约第 121 行 `case PaymentPlanId.Pro:` 和 `case PaymentPlanId.Hobby:` 分支内）**

在 `await updateUserSubscription(...)` 调用之后添加：
- 通过 `paymentProcessorUserId`（即 customerId）查询 User，获取 user.id
- 调用 Wasp Job 提交函数提交 `provisionZeroclawJob` 任务，payload 为 `{ userId: user.id }`

关于如何提交 Wasp Job，参考项目中已有的 PgBoss job 模式（`dailyStatsJob` 在 `main.wasp` 中的声明方式）。在 Wasp 中，job 通过 `context` 或直接 import 提交。需要查看 Wasp v0.21 的 job submit API。

**改动点 2：在 `handleCustomerSubscriptionDeleted` 函数中（约第 231 行）**

在 `await updateUserSubscription(...)` 调用之后添加：
- 通过 `paymentProcessorUserId` 查询 User
- 查找该用户的 ZeroclawInstance 记录
- 如果存在，更新 status = "suspended"
- 调用 `deprovisionInstance(instance.instanceId)` 通知 Server B（用 try-catch 包裹，失败时仅 log 不阻断）

**新增 import：**
- 从 `../zeroclaw/provisioning` 导入 `deprovisionInstance`
- Job 提交函数（取决于 Wasp 的 API）

**验证标准：**
- 现有 Webhook 逻辑不受影响（Stripe 签名验证、状态更新等）
- 仅在 Hobby/Pro 订阅支付成功时触发开通（Credits10 不触发）
- 取消订阅时正确停止 Server B 实例

---

### T3.2 新建 `src/zeroclaw/operations.ts` — 用户操作接口

**文件：** `app/src/zeroclaw/operations.ts`

**操作：** 新建

**依赖：** T2.2 的 `getInstanceStatus` 和 `updateInstanceApiKey`

**具体要求：**

导出 3 个函数（2 个 Wasp Action + 1 个 Wasp Query）：

**`getZeroclawInstance(args, context)` — Query**
- 从 context 获取当前用户 ID（`context.user.id`）
- 查询该用户的 ZeroclawInstance 记录
- 如果无记录，返回 null
- 如果有记录，可选地调用 `getInstanceStatus` 获取实时状态
- 返回实例信息（包含 liveStatus）

**`setZeroclawApiKey(args, context)` — Action**
- 入参验证（使用 Zod）：`{ provider: z.string().min(1), apiKey: z.string().min(1) }`
- 验证 context.user.id 对应的 ZeroclawInstance 存在且 status = "active"
- 调用 `updateInstanceApiKey(instance.instanceId, args.provider, args.apiKey)`
- 更新数据库中 ZeroclawInstance 的 provider 和 userApiKeyEncrypted 字段
- 返回 `{ success: true }`

**`retryProvision(args, context)` — Action**
- 查找 context.user.id 对应的 ZeroclawInstance
- 仅当 status = "failed" 或记录不存在时允许操作
- 提交 `provisionZeroclawJob` 任务
- 返回 `{ success: true }`

**参考模式：** 查看 `src/demo-ai-app/operations.ts` 中现有 Wasp Query/Action 的写法（函数签名、context 结构、Prisma 使用方式）。

**验证标准：**
- 未登录用户调用会被 Wasp 拦截（authRequired 在 main.wasp 中声明）
- 非活跃实例调用 setZeroclawApiKey 会报错

---

## T4 · 前端页面

### T4.1 新建 `src/zeroclaw/ZeroclawPage.tsx` — ZeroClaw 管理面板

**文件：** `app/src/zeroclaw/ZeroclawPage.tsx`

**操作：** 新建

**依赖的现有 UI 组件：** `src/client/components/ui/` 下的 shadcn/ui 组件（Button, Card, Badge, Input, Select 等）

**具体要求：**

页面布局分为三个区域：

**区域 1：实例状态卡片**
- 显示当前实例状态（用不同颜色的 Badge）
  - provisioning → 黄色 "开通中..."
  - active → 绿色 "运行中"
  - stopped → 灰色 "已停止"
  - suspended → 橙色 "已暂停"
  - failed → 红色 "开通失败"
- 显示实例信息：instanceId、dashboardUrl、port
- 当 status = active 时，显示 "打开 Dashboard" 按钮（链接到 dashboardUrl，新窗口打开）
- 当 status = failed 时，显示 "重新开通" 按钮

**区域 2：LLM API Key 配置表单**
- Provider 下拉选择框：OpenRouter / Anthropic / OpenAI / Google Gemini
- API Key 密码输入框
- "保存并激活" 按钮
- 保存时调用 `setZeroclawApiKey` Action
- 仅在 status = active 时显示此区域

**区域 3：空状态**
- 当无 ZeroclawInstance 记录时
- 显示 "ZeroClaw 暂未开通，请先完成订阅"
- 提供 "前往定价页" 链接

**使用的 Wasp hooks：**
- `useQuery(getZeroclawInstance)` 获取实例数据
- `useAction(setZeroclawApiKey)` 保存 API Key
- `useAction(retryProvision)` 重试开通

**参考页面：** `src/user/AccountPage.tsx` 的整体页面结构和样式模式

**验证标准：**
- 页面在各种状态（null / provisioning / active / failed / suspended）下都有合理展示
- API Key 输入框为 password 类型
- 保存按钮在提交时显示 loading 状态

---

## T5 · Wasp 声明注册

### T5.1 修改 `main.wasp` — 注册所有新增声明

**文件：** `app/main.wasp`

**操作：** 修改

**具体要求：**

在 `main.wasp` 末尾（`//#endregion Contact Form Messages` 之后）添加一个新的 region：

**1. Route + Page 声明：**

```
route ZeroclawRoute { path: "/zeroclaw", to: ZeroclawPage }
page ZeroclawPage {
  authRequired: true,
  component: import ZeroclawPage from "@src/zeroclaw/ZeroclawPage"
}
```

**2. Query 声明：**

```
query getZeroclawInstance {
  fn: import { getZeroclawInstance } from "@src/zeroclaw/operations",
  entities: [User, ZeroclawInstance]
}
```

**3. Action 声明：**

```
action setZeroclawApiKey {
  fn: import { setZeroclawApiKey } from "@src/zeroclaw/operations",
  entities: [User, ZeroclawInstance]
}

action retryProvision {
  fn: import { retryProvision } from "@src/zeroclaw/operations",
  entities: [User, ZeroclawInstance]
}
```

**4. Job 声明：**

```
job provisionZeroclawJob {
  executor: PgBoss,
  perform: {
    fn: import { provisionZeroclawForUser } from "@src/zeroclaw/provisioningJob"
  },
  entities: [User, ZeroclawInstance]
}
```

**注意事项：**
- `entities` 列表中必须包含 `ZeroclawInstance`（T1 中新定义的模型）
- Job 无需 `schedule`（非定时任务，由 Webhook 触发提交）
- 参考现有 `dailyStatsJob` 的声明格式

**验证标准：**
- `wasp compile` 或 `wasp start` 无报错
- 所有 import 路径与实际文件路径匹配

---

## T6 · 环境变量与部署

### T6.1 更新 `.env.server` 和 `.env.server.example`

**文件：** `app/.env.server`、`app/.env.server.example`

**操作：** 修改

**具体要求：**

在两个文件末尾添加以下环境变量：

```
# ZeroClaw Provisioning (Server B)
SERVER_B_API_URL=https://zeroclaw.example.com
SERVER_B_API_KEY=
ZEROCLOW_DASHBOARD_BASE_URL=https://zeroclaw.example.com
ZEROCLOW_BASE_PORT=42618
ZEROCLOW_MAX_PORT=65535
```

其中 `.env.server.example` 中 API_KEY 留空（提示需填写），`.env.server` 中填入 Server B 部署时生成的实际密钥。

**验证标准：**
- 应用启动时不因缺少环境变量崩溃（或给出明确提示）

### T6.2 更新 NavBar 添加 ZeroClaw 入口

**文件：** `app/src/client/components/NavBar/` 下的相关文件

**操作：** 修改

**具体要求：**

在导航栏中为已登录用户添加 "ZeroClaw" 导航链接，指向 `/zeroclaw`。

参考现有导航项（如 "Demo App"、"Account"）的添加方式。

---

## T7 · 集成验证

### T7.1 端到端手动测试

**前提：** Server B 已部署完成（参见 `task_list_zeroclaw.md`）

**测试用例：**

| 用例 | 操作 | 预期结果 |
|------|------|----------|
| 新用户注册 | 注册一个测试账号 | 跳转到 /demo-app，无 ZeroclawInstance |
| 访问 ZeroClaw 页面 | 导航到 /zeroclaw | 显示 "暂未开通" 空状态 |
| 购买订阅 | 使用 Stripe 测试卡号购买 Hobby/Pro | 支付成功 |
| 检查开通 | 查看 /zeroclaw 页面 | 状态变为 active，Dashboard URL 可点击 |
| 配置 API Key | 填入 OpenRouter API Key 并保存 | 保存成功，无报错 |
| 访问 Dashboard | 点击 Dashboard URL | 跳转到 Server B 的 ZeroClaw Web 界面 |
| 取消订阅 | 在 Stripe Portal 取消 | Server B 实例停止，状态变为 suspended |
| 续费恢复 | 重新购买订阅 | 实例恢复，状态变为 active |
| 开通失败重试 | 模拟开通失败后点击重新开通 | 重新提交 Job |

### T7.2 编译验证

完成所有任务后，执行以下命令确保无编译错误：

```
cd app && npx prisma generate
cd app && npx tsc --noEmit
cd app && wasp compile
```

---

## 文件清单速查

| 文件 | 操作 | 任务 |
|------|------|------|
| `app/schema.prisma` | 修改 | T1.1 |
| `app/src/zeroclaw/portAllocator.ts` | 新建 | T2.1 |
| `app/src/zeroclaw/provisioning.ts` | 新建 | T2.2 |
| `app/src/zeroclaw/provisioningJob.ts` | 新建 | T2.3 |
| `app/src/payment/stripe/webhook.ts` | 修改 | T3.1 |
| `app/src/zeroclaw/operations.ts` | 新建 | T3.2 |
| `app/src/zeroclaw/ZeroclawPage.tsx` | 新建 | T4.1 |
| `app/main.wasp` | 修改 | T5.1 |
| `app/.env.server` | 修改 | T6.1 |
| `app/.env.server.example` | 修改 | T6.1 |
| `app/src/client/components/NavBar/*` | 修改 | T6.2 |

## 执行顺序

```
T1.1 (schema)
  → T2.1 (portAllocator) ─┐
  → T2.2 (provisioning)  ─┼─→ T2.3 (provisioningJob) ─→ T3.1 (webhook)
                          └─→ T3.2 (operations) ─────→ T4.1 (ZeroclawPage)
                                                         ↓
                                                      T5.1 (main.wasp)
                                                         ↓
                                                      T6.1 + T6.2 (env + nav)
                                                         ↓
                                                      T7.1 + T7.2 (验证)
```
