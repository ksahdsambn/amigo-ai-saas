# ARCHITECTURE.md — Amigo (agentkm.com) 文件结构

## 项目根目录

```
/root/opencode/my-saas-app_20260327/
├── app/                  ← Wasp 主项目目录
├── blog/                 ← 博客内容（静态）
├── dev_doc/              ← 开发文档（部署计划、任务清单、操作记录）
├── e2e-tests/            ← 端到端测试
└── README.md
```

## app/ — Wasp 主项目

### 配置文件

| 文件 | 作用 |
|------|------|
| `main.wasp` | Wasp 项目声明文件：定义 app 配置、auth、数据库、路由、页面、API、Query/Action/Job 声明 |
| `schema.prisma` | Prisma 数据库 Schema：定义所有数据库模型（User, Task, File, DailyStats, ZeroclawInstance 等） |
| `tsconfig.json` | TypeScript 编译配置 |
| `vite.config.ts` | Vite 前端构建配置 |
| `components.json` | shadcn/ui 组件配置 |
| `package.json` | Node.js 依赖管理 |
| `.env.server` | 服务端环境变量（Stripe keys、DB URL、Server B 配置等） |
| `.env.server.example` | 环境变量示例模板 |
| `.env.client.bak` | 客户端环境变量备份 |
| `.env.client.example` | 客户端环境变量示例 |
| `.wasp/` | Wasp 编译输出目录（自动生成，勿手动修改） |
| `.wasproot` | Wasp 项目根标记文件 |
| `.waspignore` | Wasp 构建排除规则 |
| `public/` | 静态资源（favicon 等） |

### src/ — 源代码

#### `src/zeroclaw/` — ZeroClaw 多用户开通模块（新增）

| 文件 | 作用 |
|------|------|
| `portAllocator.ts` | 端口分配器：查询已有实例的 numericId，找到最小可用值，计算端口号 |
| `provisioning.ts` | Server B API 客户端：HMAC-SHA256 签名认证，封装 provision/deprovision/getStatus/updateConfig 四个 API |
| `provisioningJob.ts` | PgBoss 异步 Job：完整开通流程（幂等检查 → 分配端口 → 创建DB记录 → 调用Server B → 更新状态） |
| `operations.ts` | Wasp Query + Action 接口：getZeroclawInstance (Query)、setZeroclawApiKey (Action)、retryProvision (Action) |
| `ZeroclawPage.tsx` | 前端管理页面：实例状态展示（Badge颜色）、Dashboard 跳转、API Key 配置表单、空状态提示 |

#### `src/payment/` — 支付模块

| 文件 | 作用 |
|------|------|
| `plans.ts` | 定义 PaymentPlanId 枚举（Hobby/Pro/Credits10）、SubscriptionStatus 枚举、支付计划配置 |
| `paymentProcessor.ts` | 支付处理器选择（Stripe/LemonSqueezy/Polar），当前使用 Stripe |
| `operations.ts` | Wasp Action/Query：generateCheckoutSession（创建 Stripe Checkout）、getCustomerPortalUrl（客户门户） |
| `webhook.ts` | 支付 Webhook 入口，委托给具体处理器的 webhook |
| `user.ts` | 用户订阅状态更新工具函数：updateUserSubscription、updateUserCredits |
| `stripe/` | Stripe 特定实现 |
| `stripe/webhook.ts` | Stripe Webhook 处理：invoice.paid → 更新订阅 + 触发 ZeroClaw 开通；subscription.deleted → 更新订阅 + 停止 ZeroClaw 实例 |
| `stripe/stripeClient.ts` | Stripe SDK 客户端初始化 |
| `stripe/paymentProcessor.ts` | Stripe 支付处理器实现（checkout session、customer portal、webhook） |
| `PricingPage.tsx` | 定价页面前端组件 |
| `CheckoutResultPage.tsx` | 支付结果页 |

#### `src/auth/` — 认证模块

| 文件 | 作用 |
|------|------|
| `LoginPage.tsx` | 登录页面 |
| `SignupPage.tsx` | 注册页面 |
| `userSignupFields.ts` | Wasp 用户注册字段定义 |
| `email-and-pass/` | 邮箱密码认证子模块（密码重置、邮箱验证、邮件内容模板） |

#### `src/user/` — 用户模块

| 文件 | 作用 |
|------|------|
| `AccountPage.tsx` | 账户页面：显示用户信息、订阅计划、积分、管理支付按钮 |
| `operations.ts` | Wasp Query/Action：getPaginatedUsers、updateIsUserAdminById |
| `UserDropdown.tsx` | 用户头像下拉菜单组件 |
| `UserMenuItems.tsx` | 用户菜单项列表（ZeroClaw、AI Scheduler、Account Settings、Admin Dashboard、Log Out） |
| `constants.ts` | 用户菜单项配置（名称、路由、图标、权限） |

#### `src/demo-ai-app/` — AI 日程规划 Demo

| 文件 | 作用 |
|------|------|
| `DemoAppPage.tsx` | AI Scheduler 页面：任务管理 + GPT 生成日程 |
| `operations.ts` | Wasp Actions：generateGptResponse、createTask、updateTask、deleteTask；Queries：getGptResponses、getAllTasksByUser |
| `schedule.ts` | 日程规划类型定义（TaskPriority、GeneratedSchedule） |

#### `src/analytics/` — 分析统计模块

| 文件 | 作用 |
|------|------|
| `operations.ts` | Wasp Query：getDailyStats |
| `stats.ts` | PgBoss Job：calculateDailyStats（每小时执行，统计用户数、收入、PV） |
| `providers/` | 分析数据提供者（Plausible/Google Analytics 工具函数） |

#### `src/admin/` — 管理后台

| 文件 | 作用 |
|------|------|
| `dashboards/analytics/` | 分析数据 Dashboard |
| `dashboards/users/` | 用户管理 Dashboard |
| `dashboards/messages/` | 联系表单消息管理 |
| `elements/` | 管理后台 UI 元素（Settings、Calendar、UI Buttons） |

#### `src/client/` — 前端公共组件和工具

| 文件 | 作用 |
|------|------|
| `App.tsx` | React 根组件（Wasp client rootComponent） |
| `components/NavBar/` | 导航栏组件（NavBar.tsx、constants.ts、Announcement.tsx） |
| `components/ui/` | shadcn/ui 组件库（Button、Card、Input、Select、Sheet、Dialog 等 19 个组件） |
| `components/NotFoundPage.tsx` | 404 页面 |
| `components/DarkModeSwitcher.tsx` | 暗色模式切换开关 |
| `hooks/` | 自定义 React hooks |
| `static/` | 静态资源（logo.webp 等） |
| `utils.ts` | 前端工具函数（cn — Tailwind class 合并） |

#### `src/landing-page/` — 首页

| 文件 | 作用 |
|------|------|
| `LandingPage.tsx` | 首页入口组件 |
| `components/Hero.tsx` | Hero 区域（大标题 + Banner） |
| `components/FeaturesGrid.tsx` | 特性展示网格 |
| `components/ExamplesCarousel.tsx` | 示例轮播 |
| `ExampleHighlightedFeature.tsx` | 高亮特性展示 |
| `contentSections.tsx` | 首页内容数据（features、testimonials、examples、faqs） |

#### `src/file-upload/` — 文件上传模块

| 文件 | 作用 |
|------|------|
| `FileUploadPage.tsx` | 文件上传页面 |
| `operations.ts` | Wasp Actions/Queries：createFileUploadUrl、addFileToDb、getAllFilesByUser、getDownloadFileSignedURL、deleteFile |

#### `src/server/` — 服务端工具

| 文件 | 作用 |
|------|------|
| `utils.ts` | `requireNodeEnvVar()` — 环境变量必须存在检查 |
| `validation.ts` | `ensureArgsSchemaOrThrowHttpError()` — Zod schema 验证 |
| `scripts/dbSeeds.ts` | 数据库种子脚本（mock 用户数据） |

#### `src/shared/` — 前后端共享代码

| 文件 | 作用 |
|------|------|
| `common.ts` | 共享常量（DocsUrl、BlogUrl） |
| `utils.ts` | 共享工具函数（throttleWithTrailingInvocation、assertUnreachable） |
