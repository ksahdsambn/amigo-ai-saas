# Memory - Amigo (agentkm.com) 项目操作记录

## 2026-03-27 / 2026-03-28

### 操作模型
glm-5-turbo (zhipuai-coding-plan/glm-5-turbo) / opencode/mimo-v2-omni-free

### 操作内容

#### 1. 修改 DocsUrl 和 BlogUrl
- **文件**: `app/src/shared/common.ts`
- **变更**: `DocsUrl` 和 `BlogUrl` 均改为 `https://wiki.agentkm.com`
- **影响范围**: 导航栏、页脚的 Documentation 和 Blog 链接

#### 2. 修改网站信息 (main.wasp)
- **文件**: `app/main.wasp`
- **变更**:
  - `title`: "Amigo – Your Personal AI Agent"
  - `description`: Amigo gives everyone their own cloud-based AI agent...
  - `author`: Amigo AI
  - `keywords`: AI agent, personal AI assistant, cloud agent, SaaS AI, OpenClaw, AI automation, prompt templates, AI skills, agent platform, Amigo
  - `og:title`: Amigo – Your Personal AI Agent
  - `og:site_name`: Amigo AI
  - `og:url`: https://agentkm.com
  - `og:description`: Meet Amigo — your own cloud AI agent...
  - `og:image` / `twitter:image`: https://agentkm.com/public-banner.webp

#### 3. OpenAI 模型
- **文件**: `app/src/demo-ai-app/operations.ts` (line 260)
- **状态**: 已是 `gpt-5-nano`，无需修改

#### 4. 修改首页文案和内容
修改了以下文件，品牌从 OpenClaw 迁移为 Amigo：

- **`app/src/client/components/NavBar/NavBar.tsx`**
  - 导航栏品牌名: "OpenClaw" → "Amigo Agent Store"
  - 隐藏顶部橙色公告条（注释掉 `<Announcement />` 组件）

- **`app/src/landing-page/components/Hero.tsx`**
  - 标题: "Meet Amigo — Your Personal AI Agent"
  - 副标题: Everyone deserves their own AI agent...

- **`app/src/landing-page/contentSections.tsx`**
  - `features` 数组 (9个特性): 重新编写为 Amigo 品牌特性（Personal AI Agent, Instant Activation, Pre-built Skills, Cutting-Edge AI Models 等）
  - `testimonials` 数组 (6条用户评论): 重新编写为 Amigo 用户的评价
  - `examples` 数组 (7张卡片): 从企业场景改为个人使用场景（Personal Research Assistant, Daily Task Planner, Content Writing Helper 等）
  - `faqs` 数组 (6个FAQ): 重新编写为 Amigo 相关问答

- **`app/src/landing-page/components/ExamplesCarousel.tsx`**
  - "Used by:" 改为 "Powered by Amigo:"

- **`app/src/landing-page/ExampleHighlightedFeature.tsx`**
  - 标题: "AI for Everyone"
  - 描述: Amigo bridges the gap between cutting-edge AI technology and everyday consumers...

- **`app/src/landing-page/components/FeaturesGrid.tsx`**
  - 描述: "Powerful AI capabilities, made simple and accessible for everyone."

#### 5. 构建与部署
- **后端**: `wasp build`（在 `app/` 目录下执行）
  - 输出目录: `app/.wasp/out/`
  - Server bundle: `app/.wasp/out/server/bundle/`
  - 需要上传到部署服务器 `/opt/opensaas/server-build/`
- **前端**: 在本地开发机上构建
  - 命令: `REACT_APP_API_URL=https://api.agentkm.com npx vite build`（在 `app/` 目录下执行，非 web-app 目录）
  - 构建产物: `app/.wasp/out/web-app/build/`
  - 需要上传到部署服务器 `/opt/opensaas/client-build/`
- **部署方式**: 1Panel 容器编排 (Docker Compose)
  - docker-compose.yml 位于部署服务器
  - 服务: postgres, server (wasp out), client (nginx)
  - 更新后执行: `docker compose down && docker compose up -d --build`

#### 6. Logo 和 Banner 替换 (2026-03-28)
- **Logo**: `/root/下载/logo.png` (2848x1502) → 缩小到 151x80，压缩为 webp (2.4KB)
  - 替换 `app/src/client/static/logo.webp`，Vite 自动内联为 base64（<4KB）
  - NavBar 和 admin Sidebar 均使用此文件
- **Banner**: `/root/下载/OG.png` (2848x1502) → 缩小到 1000x530，压缩为 webp
  - `open-saas-banner-light.webp` (45.7KB) + `open-saas-banner-dark.webp` (42.9KB)
  - 替换原 SVG 文件，暗色版额外降低亮度、增加对比度
  - 更新 `Hero.tsx` 导入路径从 .svg 改为 .webp
- **图片处理**: 使用 Python PIL (Image.LANCZOS) 缩放，WEBP quality=85

#### 7. 环境信息
- **开发机 Node.js**: v22.14.0（Vite 7 要求 20.19+）
- **服务器已升级**: 从 Node 18.19.1 升级到 22.14.0（手动安装到 /usr/local/node22）
- **Wasp CLI**: v0.21.1
- **`.env.client`**: `REACT_APP_API_URL=https://api.agentkm.com`

### 项目信息
- **框架**: Wasp v0.21.1 (OpenSaaS starter)
- **网站**: https://agentkm.com/
- **API**: https://api.agentkm.com
- **Wiki**: https://wiki.agentkm.com
- **技术栈**: React + TypeScript + Tailwind CSS + Prisma + Stripe + Vite 7

---

## 2026-03-30

### 操作模型
glm-5.1 (zhipuai-coding-plan/glm-5.1)

### 操作内容: ZeroClaw 多用户自动开通 — Server A 代码改动

按照 `dev_doc/task_list_opensaas.md` 任务清单，按顺序完成了所有 Server A 端代码改动。

#### T1.1 — schema.prisma 新增 ZeroclawInstance 模型
- **文件**: `app/schema.prisma`
- **变更**: User 模型添加 `zeroclawInstance ZeroclawInstance?` 关联；文件末尾新增 `ZeroclawInstance` 模型（id, userId, instanceId, numericId, status, port, dashboardUrl, pathPrefix, provider, userApiKeyEncrypted, zeroclawVersion, lastHealthCheck, provisioningError, subscriptionPlan）
- **验证**: `npx prisma generate` 成功

#### T2.1 — 新建 portAllocator.ts
- **文件**: `app/src/zeroclaw/portAllocator.ts`
- **功能**: `allocatePort()` 函数，查询已有 numericId，返回最小可用 `{ port, numericId }`

#### T2.2 — 新建 provisioning.ts
- **文件**: `app/src/zeroclaw/provisioning.ts`
- **功能**: Server B API 客户端，HMAC-SHA256 签名认证，导出 `provisionInstance`, `deprovisionInstance`, `getInstanceStatus`, `updateInstanceApiKey`

#### T2.3 — 新建 provisioningJob.ts
- **文件**: `app/src/zeroclaw/provisioningJob.ts`
- **功能**: `provisionZeroclawForUser` PgBoss Job，幂等开通流程（分配端口 → 创建DB记录 → 调用Server B → 更新状态）

#### T3.1 — 修改 webhook.ts
- **文件**: `app/src/payment/stripe/webhook.ts`
- **变更**:
  - `handleInvoicePaid`: Hobby/Pro 支付成功后提交 `provisionZeroclawJob`
  - `handleCustomerSubscriptionDeleted`: 取消订阅后更新 ZeroclawInstance.status="suspended"，调用 `deprovisionInstance`
- **新增 import**: `prisma` from `wasp/server`, `deprovisionInstance` from zeroclaw 模块

#### T3.2 — 新建 operations.ts
- **文件**: `app/src/zeroclaw/operations.ts`
- **功能**: 3个 Wasp 操作 — `getZeroclawInstance`(Query), `setZeroclawApiKey`(Action), `retryProvision`(Action)

#### T4.1 — 新建 ZeroclawPage.tsx
- **文件**: `app/src/zeroclaw/ZeroclawPage.tsx`
- **功能**: ZeroClaw 管理面板前端页面，包含实例状态卡片、Dashboard 跳转、API Key 配置表单、空状态提示

#### T5.1 — 修改 main.wasp
- **文件**: `app/main.wasp`
- **变更**: 文件末尾新增 `//#region ZeroClaw` 区域，包含 ZeroclawRoute/Page, getZeroclawInstance query, setZeroclawApiKey/retryProvision actions, provisionZeroclawJob job

#### T6.1 — 更新环境变量
- **文件**: `app/.env.server`, `app/.env.server.example`
- **新增**: SERVER_B_API_URL, SERVER_B_API_KEY, ZEROCLOW_DASHBOARD_BASE_URL, ZEROCLOW_BASE_PORT, ZEROCLOW_MAX_PORT

#### T6.2 — 更新导航入口
- **文件**: `app/src/user/constants.ts`
  - 新增 ZeroClaw 菜单项（Bot 图标，指向 /zeroclaw）
- **文件**: `app/src/client/components/NavBar/constants.ts`
  - demoNavigationitems 新增 ZeroClaw 导航项

#### T7 — 编译验证
- `wasp build` 后端构建
- `REACT_APP_API_URL=https://api.agentkm.com npx vite build` 前端构建

#### 修复 Rollup 构建错误
- **问题**: Docker 构建时 `npm run bundle` 报 RollupError — 动态 `import()` 导致代码分割，与 `output.file` 不兼容
- **文件**: `app/src/zeroclaw/operations.ts`
  - `await import("wasp/server/jobs")` → 顶部静态 `import { provisionZeroclawJob } from "wasp/server/jobs"`
- **文件**: `app/src/payment/stripe/webhook.ts`
  - `await import("wasp/server/jobs")` → 顶部静态 `import { provisionZeroclawJob } from "wasp/server/jobs"`
- **根因**: Rollup 在 `output.file` 模式下不支持动态 import 产生的多个 chunk，改为静态 import 即可

---

## 2026-03-30

### 操作模型
opencode/mimo-v2-omni-free

### 操作内容: 替换左上角 logo+品牌名 为纯 logo

#### 1. 更新 logo 资源
- **源文件**: `/root/opencode/my-saas-app_20260327/image/logo.png` (2848x1502)
- **目标**: `app/src/client/static/logo.webp`
- **操作**: 使用 Python PIL 缩放至 200x105，转换为 webp 格式 (3.4KB)
- **备注**: 保留原始尺寸的 PNG 副份 (16.6KB)

#### 2. 修改 NavBar 组件
- **文件**: `app/src/client/components/NavBar/NavBar.tsx`
- **变更**:
  - 导入路径保持为 `logo.webp`（文件内容已替换为压缩版）
  - 移除品牌名 "Amigo Agent Store" (桌面端和移动端)
  - 调整 NavLogo 组件样式:
    - 使用 `h-8 w-auto` / `h-7 w-auto` 替代固定 `size-8` / `size-7`
    - 添加 `object-contain` 保持宽高比
    - alt 文本: "Amigo Agent Store" → "Logo"
- **效果**: 左上角仅显示 logo 图片，无文字，保持与右侧导航菜单合理间距

#### 3. 替换网站 favicon.ico
- **源文件**: `/root/opencode/my-saas-app_20260327/image/logo.png` (2848x1502)
- **目标**: `app/public/favicon.ico`
- **操作**:
  - 使用 Python PIL 从中心裁剪 logo 为正方形 (1502x1502)
  - 缩放至 16x16 像素，生成 favicon.ico (615 字节)
  - 包含 16x16 尺寸
- **构建**: 运行 `REACT_APP_API_URL=https://api.agentkm.com npx vite build` 重新构建前端
- **验证**: 构建产物 `app/.wasp/out/web-app/build/favicon.ico` 已更新

---

## 2026-03-30 (下午)

### 操作模型
glm-5.1 (zhipuai-coding-plan/glm-5.1)

### 操作内容: 诊断并修复 agentkm.com 502 故障

#### 故障现象
- https://agentkm.com/ 返回 502 Bad Gateway
- DNS 正常，三个容器（postgres, server, client）均在运行

#### 诊断过程
1. `webfetch` 访问 agentkm.com 确认返回 502
2. 检查 server 容器日志，发现核心错误：
   - `The table public.ZeroclawInstance does not exist in the current database`
   - `No migration found in prisma/migrations`
   - 前端每次页面加载都会调用 `get-zeroclaw-instance` query，因表不存在返回 500
3. 检查 postgres 容器日志，发现健康检查刷屏：
   - `FATAL: database "opensaas" does not exist`（每10秒一次）
   - 原因：`pg_isready -U opensaas` 默认连接名为 `opensaas` 的库，实际库名是 `opensaas_db`
4. 检查 client (nginx) 容器日志，确认静态页面正常返回 200

#### 根因分析
| 问题 | 原因 | 影响 |
|------|------|------|
| ZeroclawInstance 表不存在 | 从未运行 `wasp db migrate-dev` 生成迁移文件，`.wasp/out/db/migrations/` 目录不存在 | 所有登录用户页面触发 500 错误 |
| postgres 健康检查报错 | `pg_isready -U opensaas` 缺少 `-d opensaas_db` | 日志刷屏，不影响功能 |
| 缺少 Stripe 环境变量 | docker-compose 未配置 `PAYMENTS_*_PLAN_ID` | 支付功能无法使用 |
| 缺少 Plausible 环境变量 | 未配置 `PLAUSIBLE_*` | 统计 Job 每小时报错 |

#### 修复操作

##### 1. 手动创建 ZeroclawInstance 迁移文件
- **原因**: 开发机无 Docker/PostgreSQL，无法运行 `wasp db migrate-dev`
- **文件**: `app/.wasp/out/db/migrations/20260330120000_add_zeroclaw_instance/migration.sql`
- **内容**: CREATE TABLE ZeroclawInstance（含 userId/instanceId/numericId 唯一索引 + 外键关联 User）
- **验证**: `DATABASE_URL=... npx prisma validate` 通过

##### 2. 需要在服务器上修改 docker-compose.yml（待部署）
- postgres 健康检查: `pg_isready -U opensaas` → `pg_isready -U opensaas -d opensaas_db`
- server 环境变量添加: `PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID`, `PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID`, `PAYMENTS_CREDITS_10_PLAN_ID`

##### 3. 部署步骤（待用户执行）
```bash
# 开发机
cd app && wasp build
scp -r .wasp/out/ root@服务器:/opt/opensaas/server-build/

# 服务器
docker compose down && docker compose up -d --build
```

#### 备注
- 502 实际上在 nginx client 日志中已不存在（页面返回 200），但登录后所有涉及 ZeroclawInstance 的操作都会 500
- 本机 wasp CLI v0.21.1 可用，但无本地数据库，迁移文件为手动编写
