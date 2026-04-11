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

---

## 2026-04-03

### 操作模型
glm-5.1 (zhipuai-coding-plan/glm-5.1)

### 操作内容: ZeroClaw Server B 部署 — P1~P4 阶段

按照 `dev_doc/task_list_zeroclaw.md` 任务清单，按顺序完成 P1~P4 阶段。

#### Server B 信息
- **域名**: amigo.agentkm.com
- **IP**: 45.82.121.249
- **SSH**: root@45.82.121.249:22
- **OS**: Debian 12 (Bookworm)
- **架构**: x86_64

#### P1 · 系统初始化

##### P1.1 — 安装基础软件
- `apt-get install -y nginx certbot python3-certbot-nginx nodejs npm curl`
- **验证**: nginx/1.22.1, Node.js v18.20.4, npm 9.2.0, certbot 2.1.0, curl 7.88.1

##### P1.2 — 创建运行用户和目录结构
- `useradd -r -s /bin/false agent`
- 目录结构:
  - `/opt/zeroclaw/bin/` — 二进制 + 版本管理
  - `/opt/zeroclaw/data/users/` — 每用户数据目录（owner=agent:agent, mode=700）
  - `/opt/zeroclaw/provisioning/src/` — Provisioning API
  - `/opt/zeroclaw/logs/` — 日志
  - `/opt/zeroclaw/updates/` — 更新脚本
  - `/etc/nginx/zeroclaw-routes/` — Nginx 动态路由配置片段

##### P1.3 — 配置防火墙
- `apt-get install -y ufw`（Debian 默认无 ufw）
- 开放端口: 22/tcp, 80/tcp, 443/tcp
- **验证**: `ufw status` 仅显示 22/80/443

#### P2 · ZeroClaw 二进制部署

##### P2.1 — 下载并安装 ZeroClaw 二进制
- **版本**: v0.6.8
- **来源**: `https://github.com/zeroclaw-labs/zeroclaw/releases/download/v0.6.8/zeroclaw-x86_64-unknown-linux-gnu.tar.gz`
- **安装路径**: `/opt/zeroclaw/bin/zeroclaw-0.6.8`
- **Symlink**: `/opt/zeroclaw/bin/zeroclaw` → `zeroclaw-0.6.8`
- **验证**: `/opt/zeroclaw/bin/zeroclaw --version` → `zeroclaw 0.6.8`

#### P3 · systemd 配置

##### P3.1 — 创建 zeroclaw@.service 模板 unit
- **文件**: `/etc/systemd/system/zeroclaw@.service`
- **内容**: Type=simple, ExecStart=zeroclaw daemon, ZEROCLAW_CONFIG_DIR=%i, User=agent, MemoryMax=256M, CPUQuota=50%, Slice=agent.slice

##### P3.2 — 创建 agent.slice
- **文件**: `/etc/systemd/system/agent.slice`
- **内容**: CPUAccounting=yes, MemoryAccounting=yes
- `systemctl daemon-reload` 完成
- **验证**: `systemctl list-unit-files | grep zeroclaw` 显示 zeroclaw@.service

#### P4 · Nginx 反向代理

##### P4.1 — 配置 SSL 证书
- `certbot --nginx -d amigo.agentkm.com --non-interactive --agree-tos`
- **管理员邮箱**: 自动生成随机邮箱
- **证书路径**: `/etc/letsencrypt/live/amigo.agentkm.com/`
- **有效期至**: 2026-07-02
- **自动续期**: certbot 已配置定时任务

##### P4.2 — 配置 Nginx 主配置
- **文件**: `/etc/nginx/sites-available/default`
- **内容**:
  - HTTP 80 → 301 重定向到 HTTPS
  - HTTPS 443 server_name=amigo.agentkm.com
  - `/api/` → proxy_pass http://127.0.0.1:3100 (Provisioning API)
  - `include /etc/nginx/zeroclaw-routes/*.conf` (动态路由)
  - 默认 location `/` → 404
- **验证**:
  - `nginx -t` syntax OK
  - HTTP → HTTPS 301 重定向正常
  - `https://amigo.agentkm.com/` → 404（正确）
  - `https://amigo.agentkm.com/api/health` → 502（Provisioning API 尚未部署，符合预期）

#### P5 · Provisioning API 开发

##### P5.1 — 初始化 npm 项目
- **目录**: `/opt/zeroclaw/provisioning/`
- **package.json**: name=zeroclaw-provisioning, type=module, express ^4.21.2
- **验证**: node_modules/ 和 package-lock.json 已生成

##### P5.2 — auth.js (HMAC 认证中间件)
- **文件**: `/opt/zeroclaw/provisioning/src/auth.js`
- **功能**: 提取 X-Timestamp + X-Signature 头 → 5分钟时间窗口检查 → HMAC-SHA256 签名验证 → crypto.timingSafeEqual 防时序攻击
- **测试**: 无认证头 → 401, 错误签名 → 401, 正确签名 → 通过, 过期时间戳 → 401

##### P5.3 — config.js (config.toml 模板渲染)
- **文件**: `/opt/zeroclaw/provisioning/src/config.js`
- **功能**: renderConfig(opts) 生成 TOML 配置, updateConfigContent(content, opts) 用正则替换 api_key + default_provider

##### P5.4 — systemd.js (systemd 服务管理)
- **文件**: `/opt/zeroclaw/provisioning/src/systemd.js`
- **功能**: provisionInstance (创建目录+写config+启systemd+等待健康检查), deprovisionInstance (停止+禁用，保留数据), getInstanceStatus (读取ActiveState/PID/Memory/Port), updateConfig (替换api_key+provider+重启)
- **辅助**: waitForHealth 轮询 /health 端点，超时30秒

##### P5.5 — nginx.js (Nginx 路由管理)
- **文件**: `/opt/zeroclaw/provisioning/src/nginx.js`
- **功能**: addNginxRoute (生成 /etc/nginx/zeroclaw-routes/{id}.conf + reload), removeNginxRoute (删除 + reload, try-catch容错)
- **location 块**: proxy_pass + WebSocket 升级头 + proxy_read_timeout 86400

##### P5.6 — health.js + index.js (健康检查 + 入口)
- **文件**: `/opt/zeroclaw/provisioning/src/health.js` — healthCheck() 返回 activeInstances, totalInstances, zeroclawVersion, diskUsage, timestamp
- **文件**: `/opt/zeroclaw/provisioning/src/index.js` — Express 入口，路由：
  - GET /api/health (无认证)
  - POST /api/provision (认证)
  - POST /api/deprovision (认证)
  - GET /api/instances/:id (认证)
  - POST /api/instances/:id/config (认证)
  - POST /api/update-all (admin key)
- 监听 127.0.0.1:3100

##### P5.7 — 创建 systemd service + .env
- **文件**: `/etc/systemd/system/provisioning.service` — User=root, EnvironmentFile=.env, ExecStart=/usr/bin/node src/index.js
- **文件**: `/opt/zeroclaw/provisioning/.env` — PROVISIONING_PORT=3100, PROVISIONING_API_KEY + ADMIN_KEY (openssl rand -hex 32), ZEROCLOW_BINARY, DATA_DIR, DOMAIN=amigo.agentkm.com
- **权限**: .env chmod 600
- **验证**:
  - `systemctl status provisioning` → active (running)
  - `curl http://127.0.0.1:3100/api/health` → `{"status":"ok","activeInstances":0,"totalInstances":0,"zeroclawVersion":"zeroclaw 0.6.8","diskUsage":"6%"}`
  - `curl https://amigo.agentkm.com/api/health` → 同上（Nginx HTTPS 反代正常）
  - 认证中间件 4 项测试全部通过

##### 生成的密钥（需配置到 Server A .env.server）
- **PROVISIONING_API_KEY**: `3ac0a9b9d6b54034fdd0c4ae874bae75a0bcf2ede67d3f6ea7398c24be5c25a7`
- **ADMIN_KEY**: `b0bc773af11214d462ddf61000cec6844e9c79f40fa30273b59452baaff60ae0`

## 2026-04-03 (下午)

### 操作模型
glm-5.1 (zhipuai-coding-plan/glm-5.1)

### 操作内容: ZeroClaw Server B 部署 — P6~P8 阶段

按照 `dev_doc/task_list_zeroclaw.md` 任务清单，按顺序完成 P6~P8 阶段。

#### P6 · 安全加固

##### P6.1 — 安全检查清单
- **PROVISIONING_API_KEY**: 64 字符 hex ✅
- **SSL 证书**: TLSv1.3, Let's Encrypt, 有效期至 2026-07-02 ✅
- **防火墙**: UFW 仅 22/80/443 ✅
- **API 端口**: 3100 仅监听 127.0.0.1 ✅
- **agent 用户**: shell=/bin/false ✅
- **.env 权限**: -rw------- (600) ✅
- **config.toml 权限**: 600 (P8 实例创建后验证) ✅

##### P6.2 — HMAC 认证测试
- 无认证头 → 401 "Missing authentication headers" ✅
- 错误签名 → 401 "Invalid signature" ✅
- 过期 timestamp → 401 "Timestamp expired" ✅
- 正确签名 → 200 ✅
- /api/health 无需认证 → 200 ✅

#### P7 · 更新机制

##### P7.1 — update-all.sh 一键更新脚本
- **文件**: `/opt/zeroclaw/updates/update-all.sh` (4353 bytes, chmod +x)
- **流程**: 获取 GitHub 最新版本 → 比较当前版本 → 下载对应架构 tar.gz → 验证二进制 → 替换 symlink → 滚动重启所有 zeroclaw@* 实例 → 清理旧版本(保留最近3个)
- **cron 定时任务**: `0 3 * * *` (每天 UTC 凌晨 3 点自动执行)
- **cron 服务**: 已安装 cron 包并启用
- **测试结果**: 脚本正确获取 GitHub 最新版本 0.6.8，检测到当前已是最新版并正常退出

#### P8 · 集成验证

##### P8.1 — 手动开通/注销测试

**测试 1: 手动创建并启动 ZeroClaw 实例**
- 创建 test001 目录 + config.toml (port=42999, path_prefix=/test001)
- `systemctl start zeroclaw@test001` → active (running)
- 端口 42999 正常监听, health 返回 status:ok
- 日志显示 Gateway + WebSocket + REST API 端点正常注册
- 清理测试数据 → 成功

**测试 2: 通过 Provisioning API 开通**
- POST /api/provision (instanceId=utest, port=42999)
- 返回 success:true, dashboardUrl: https://amigo.agentkm.com/utest/
- systemd 服务 enabled+active, cgroup 限制生效 (Memory 4.9M/max 256M)
- Nginx 路由文件已生成 (location /utest/ + WebSocket 升级头 + proxy_read_timeout 86400)
- health 端点返回 ok
- config.toml 权限 -rw------- (600, agent:agent) — P6.1 遗留验证项 ✅

**测试 3: 通过 API 注销**
- POST /api/deprovision (instanceId=utest)
- 返回 success:true
- 服务 inactive, Nginx 路由文件已删除
- 数据目录 /opt/zeroclaw/data/users/utest/ 保留 ✅

**测试 4: 资源限制验证**
- MemoryMax = 268435456 (256MB) ✅
- MemorySwapMax = 0 ✅
- CPUQuotaPerSecUSec = 500ms (50%) ✅
- TasksMax = 64 ✅
- Slice = agent.slice ✅

##### P8.2 — 与 Server A 联调验证
- **Server A .env.server 已更新**: SERVER_B_API_URL=https://amigo.agentkm.com, SERVER_B_API_KEY=3ac0a9b9d6b54034fdd0c4ae874bae75a0bcf2ede67d3f6ea7398c24be5c25a7
- **Server A .env.server.example 已更新**: 域名改为 amigo.agentkm.com
- **联调测试** (模拟 Server A 使用 .env.server 中的 KEY 调用 Server B):
  - 外部 HTTPS health → 200 ✅
  - provision → success:true, systemd active ✅
  - Nginx 路由生成 → 正确 ✅
  - API Key 更新 → config.toml 中 api_key + provider 已修改 ✅
  - deprovision → 服务停止 ✅
- **待做**: Server A 重新部署后触发实际 Stripe 支付 → 自动开通端到端验证

---

#### ZeroClaw Server B 部署总结

所有阶段 P1~P8 均已完成：
- ✅ P1 系统初始化
- ✅ P2 ZeroClaw 二进制部署 (v0.6.8)
- ✅ P3 systemd 配置 (模板 unit + agent.slice)
- ✅ P4 Nginx 反向代理 (SSL + 动态路由)
- ✅ P5 Provisioning API 开发 (Express + HMAC 认证)
- ✅ P6 安全加固 (7 项检查 + 认证测试)
- ✅ P7 更新机制 (update-all.sh + cron)
- ✅ P8 集成验证 (4 个手动测试 + Server A 联调)

---

## 2026-04-11

### 操作模型
glm-5.1 (zhipuai-coding-plan/glm-5.1)

### 操作内容: AI Scheduler → Agent Examples（项目拆解器） + NVIDIA NIM API 替换

#### 1. 功能重写: AI Day Scheduler → Agent Examples 项目拆解器

##### 1.1 — 重写 schedule.ts 类型定义
- **文件**: `app/src/demo-ai-app/schedule.ts`
- **变更**: 移除 `GeneratedSchedule` / `Task` / `TaskItem` / `TaskPriority` 旧类型
- **新增类型**:
  - `TaskPriority`: `"high" | "medium" | "low"`
  - `ProjectBreakdown`: `{ phases: Phase[] }`
  - `Phase`: `{ priority: TaskPriority, label: string, tasks: PhaseTask[] }`
  - `PhaseTask`: `{ description: string, time: string }`

##### 1.2 — 重写 operations.ts 后端逻辑
- **文件**: `app/src/demo-ai-app/operations.ts`
- **变更**:
  - OpenAI client → NVIDIA NIM client (`baseURL: https://integrate.api.nvidia.com/v1`)
  - 模型: `gpt-5-nano` → `google/gemma-4-31b-it`
  - API Key 环境变量: `OPENAI_API_KEY` → `NVIDIA_API_KEY`
  - 输入参数: `{ hours: number }` → `{ projectGoal: string }`
  - 输出类型: `GeneratedSchedule` → `ProjectBreakdown`
  - AI 调用方式: 移除 function calling，改为 JSON 文本输出 + 正则提取解析
  - System prompt: 从"日程规划师"改为"项目架构师"，要求返回三阶段优先级结构（高/MVP、中/上线前、低/后续迭代）
  - 保留: createTask, updateTask, deleteTask, getGptResponses, getAllTasksByUser 不变

##### 1.3 — 重写 DemoAppPage.tsx 前端页面
- **文件**: `app/src/demo-ai-app/DemoAppPage.tsx`
- **变更**:
  - 标题: "AI Day Scheduler" → "Agent Examples"
  - 副标题: 改为项目拆解器描述
  - 移除: TodoList、工作小时数输入、Generate Schedule 按钮
  - 新增: 单一输入框（项目目标）+ "拆解项目" 按钮
  - 新增: PhaseCard 组件 — 按优先级渲染三阶段卡片
    - 🔴 高优先级 (红色边框+背景): "MVP 必须完成"
    - 🟡 中优先级 (黄色边框+背景): "上线前应完成"
    - 🟢 低优先级 (绿色边框+背景): "后续迭代可做"
  - 新增: PhaseTaskItem 组件 — 每个任务带 checkbox + 描述 + 时间估算

##### 1.4 — 更新导航栏
- **文件**: `app/src/client/components/NavBar/constants.ts`
- **变更**: `demoNavigationitems` 中 "AI Scheduler" → "Agent Examples"

#### 2. 替换 AI API: OpenAI → NVIDIA NIM

| 配置项 | 旧值 | 新值 |
|--------|------|------|
| Provider | OpenAI | NVIDIA NIM (OpenAI 兼容) |
| Base URL | 默认 (api.openai.com) | `https://integrate.api.nvidia.com/v1` |
| Model | `gpt-5-nano` | `google/gemma-4-31b-it` |
| API Key Env | `OPENAI_API_KEY` | `NVIDIA_API_KEY` |
| API Key 值 | sk-proj-z881... | nvapi-rc9sU6qeS4O... |
| 调用方式 | function calling (tool_choice) | 纯文本 JSON 输出 + 正则解析 |
| Temperature | 1 | 0.7 |

#### 3. 环境变量更新
- **文件**: `app/.env.server` — 新增 `NVIDIA_API_KEY=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`
- **文件**: `app/src/server/validation.ts` — 增加调试日志，错误信息中输出具体 validation errors

#### 4. 构建与部署
- **后端**: `wasp build` — 成功
- **前端**: `REACT_APP_API_URL=https://api.agentkm.com npx vite build` — 成功
- **代码推送**: 3 次 commit 推送到 https://github.com/ksahdsambn/amigo-ai-saas
  - `f0cfe6e` — 主要功能变更（5 文件，+233 -476 行）
  - `4ecd4c1` — validation 调试日志
  - `abb17bc` / `11f8016` — 部署脚本

#### 5. docker-compose.yml 更新
- **文件**: `/root/下载/docker-compose.yml`
- **变更**: server 环境变量 `OPENAI_API_KEY` → `NVIDIA_API_KEY`（值替换为 nvapi-...）
- **部署方式**: 用户需手动上传到服务器 `/opt/opensaas/docker-compose.yml`

#### 6. 故障排查记录
- **问题**: 用户测试时输入"出发去香港的路程"报 "Operation arguments validation failed"
- **原因**: 部署服务器后端仍在运行旧代码（期望 `{ hours: number }`），新前端发送 `{ projectGoal: string }`
- **解决**: 需更新服务器上的构建产物 + docker-compose.yml 环境变量，重建容器

#### 7. 构建产物纳入 Git 跟踪
- **文件**: `app/.gitignore`
- **变更**: 在 `.wasp/` 排除规则后添加 `!.wasp/out/` 及子目录的白名单规则，使 `app/.wasp/out/` 构建产物可被 git 跟踪并推送
- **原因**: 服务器无需安装 wasp/vite 环境，直接 `git pull` 获取构建产物，部署更快更稳定
- **构建产物大小**: 约 21MB（1684 个文件，含 SDK + server bundle + web-app build）
- **首次 `git push`**: commit `7cdc4b2`，1685 files changed, +102824 insertions

#### 8. docker-compose.yml 更新（本地）
- **文件**: `/root/下载/docker-compose.yml`
- **变更**: server 环境变量 `OPENAI_API_KEY: "sk-proj-z881..."` → `NVIDIA_API_KEY: "nvapi-rc9sU6qeS4O..."`
- **部署方式**: 用户手动上传到服务器 `/opt/opensaas/docker-compose.yml`

#### 9. 部署脚本 deploy-server.sh
- **文件**: `deploy-server.sh`（项目根目录）
- **功能**: 服务器端自动部署脚本，流程：
  1. `cd /opt/opensaas/repo && git fetch --all && git reset --hard origin/main`
  2. 比对 git commit hash，无变化则跳过部署
  3. rsync 同步后端构建产物 → `/opt/opensaas/server-build/`（排除 node_modules）
  4. rsync 同步前端构建产物 → `/opt/opensaas/client-build/`
  5. 自动检测并替换 docker-compose.yml 中的 OPENAI_API_KEY → NVIDIA_API_KEY
  6. `docker compose build --no-cache server && docker compose up -d server client`
  7. 健康检查，输出结果
- **日志**: `/opt/opensaas/deploy.log`
- **删除旧文件**: `deploy-update.sh`（旧版，需要服务器有 wasp 环境，已废弃）

#### 10. 服务器初始化步骤（一次性）
```bash
# 克隆私有仓库（使用 PAT token）
cd /opt/opensaas/repo
git clone https://x-access-token:<PAT>@github.com/ksahdsambn/amigo-ai-saas.git .
chmod +x /opt/opensaas/repo/deploy-server.sh
```
- PAT token 只在首次 `git clone` 时使用，之后 git 会保存在 `.git/config` 中自动认证

#### 11. 1Panel 计划任务配置
- **任务类型**: Shell 脚本
- **任务名称**: Amigo 自动部署
- **执行周期**: 每 30 分钟一次
- **在容器中执行**: 关闭（不勾选）
- **用户**: root
- **解释器**: /bin/bash
- **脚本内容**: `bash /opt/opensaas/repo/deploy-server.sh`
- **说明**: 脚本自动检测代码变化，无新 commit 则跳过，不会重复构建

#### 12. 完整日常更新流程
```
本地开发机                                    服务器（自动）
─────────                                    ─────────
1. 修改代码
2. cd app && wasp build
3. REACT_APP_API_URL=https://api.agentkm.com npx vite build
4. git add -A && git commit -m "xxx"
5. git push origin main
                                             6. 1Panel 每30分钟触发 deploy-server.sh
                                                → git pull 发现有新 commit
                                                → rsync 同步构建产物
                                                → docker compose 重建容器
                                                → 网站更新完成
```

#### 13. 服务器目录结构
```
/opt/opensaas/
├── docker-compose.yml          # Docker Compose 编排文件
├── spa.conf                    # Nginx SPA 配置
├── server-build/               # 后端构建产物（Docker 构建上下文）
├── client-build/               # 前端构建产物（Nginx 静态文件）
├── repo/                       # Git 仓库（含构建产物）
│   ├── deploy-server.sh        # 部署脚本
│   ├── app/
│   │   ├── .wasp/out/          # 构建产物（已纳入 Git）
│   │   ├── src/                # 源代码
│   │   └── ...
│   └── ...
├── deploy.log                  # 部署日志
└── backup_*/                   # 部署备份（如手动创建）

---

## 2026-04-12

### 操作模型
glm-5.1 (zhipuai-coding-plan/glm-5.1)

### 操作内容: 修复"拆解项目"功能的 network error

#### 问题诊断
1. **前端构建产物包含错误的 API URL**
   - 问题：`.env.client` 文件缺失，导致 `REACT_APP_API_URL` 使用默认值 `http://localhost:3001`
   - 影响：浏览器访问 `agentkm.com` 时，API 请求发送到 `localhost:3001`，无法连接，报 "network error"
   
2. **NVIDIA API 调用超时**
   - 问题：NVIDIA NIM API 调用需要约 50 秒生成响应，但 OpenResty 代理默认 `proxy_read_timeout` 为 60 秒
   - 影响：接近超时边界，响应可能不稳定
   - 额外问题：NVIDIA 返回的 JSON 被 `` ```json `` markdown 包裹，解析时需要清理

#### 修复内容

##### 1. 创建 `.env.client` 文件
- **文件**: `app/.env.client`
- **内容**: `REACT_APP_API_URL=https://api.agentkm.com`
- **作用**: 确保前端构建时使用正确的 API 地址

##### 2. 后端代码优化
- **文件**: `app/src/demo-ai-app/operations.ts`
- **变更**:
  - 添加 `max_tokens: 2048` 限制响应长度，加快生成速度
  - 改进 JSON 解析，自动去除 `` ```json `` markdown 包裹
  - 添加详细错误日志便于调试

##### 3. Nginx 代理配置优化
- **位置**: `/opt/1panel/www/conf.d/api.agentkm.com.conf`
- **变更**: 在 `location ^~ /` 块添加超时配置
  - `proxy_connect_timeout 120s;`
  - `proxy_send_timeout 120s;`
  - `proxy_read_timeout 120s;`
- **作用**: 为 NVIDIA API 调用预留足够时间，避免超时中断

##### 4. 构建与部署
- **后端**: `wasp build` — 成功
- **前端**: `REACT_APP_API_URL=https://api.agentkm.com npx vite build` — 成功
- **代码提交**: 1 次 commit 推送到 GitHub
  - `48ff7d0` — fix: add max_tokens to NVIDIA API call, strip markdown fences from response, prevent timeout
- **服务器部署**:
  - 1Panel 计划任务自动拉取代码
  - rsync 同步前后端构建产物
  - `docker compose up -d --build server client` 重建容器
  - OpenResty 配置更新并 reload

#### 测试结果
- 用户测试输入 "play soccer" 执行"拆解项目"
- 前端正确请求 `https://api.agentkm.com/operations/generate-gpt-response`
- 后端成功调用 NVIDIA NIM API（约 30-50 秒）
- 返回的 JSON 被正确解析并展示

#### 注意事项
- NVIDIA API 生成时间较长，用户可能需要等待 30-50 秒
- 如仍报网络错误，请清除浏览器缓存或使用无痕窗口测试
- 建议将 1Panel 计划任务周期从 30 分钟改为 1 小时，减少不必要的容器重建

---

## 2026-04-12

### 操作模型
glm-5.1 (zhipuai-coding-plan/glm-5.1)

### 操作内容：修复 Admin Dashboard 的 "data is undefined" 错误

#### 故障现象
- 登录后访问 https://agentkm.com/admin/dashboard
- 显示 "Error" 和 `["operations/get-daily-stats"] data is undefined`
- 页面无法加载任何统计卡片数据

#### 根因分析
通过 SSH 登录服务器排查，发现：

1. **DailyStats 表为空**：`SELECT count(*) FROM "DailyStats"` 返回 0
2. **dailyStatsJob 从未成功执行**：
   - Job 每小时运行一次（cron: `0 * * * *`）
   - 日志显示：`Error calculating daily stats: Failed to parse URL from undefined/v1/stats/aggregate?site_id=undefined&metrics=pageviews`
   - 错误原因是 `PLAUSIBLE_API_KEY`、`PLAUSIBLE_SITE_ID`、`PLAUSIBLE_BASE_URL` 环境变量未配置

3. **环境变量缺失**：
   ```bash
   docker inspect opensaas-server --format='{{json .Config.Env}}'
   # 没有 PLAUSIBLE_* 相关变量
   ```

4. **getDailyStats 查询返回 undefined**：
   ```
   POST /operations/get-daily-stats 200 17.539 ms - 51
   # 响应体是 51 字节，实际内容是 undefined 的 JSON 序列化结果
   ```

#### 修复内容

##### 1. 修改 stats.ts 增加容错处理
- **文件**: `app/src/analytics/stats.ts`
- **变更**:
  - 将 `getDailyPageViews()` 调用包裹在 try-catch 中
  - 如果没有配置 Plausible，使用默认值：`totalViews=0`, `prevDayViewsChangePercent="0"`
  - 收入获取也增加 try-catch，Stripe/LemonSqueezy/Polar 任一失败不影响整体
  - 移除对 `getSources()` 的强依赖

##### 2. 手动创建 DailyStats 种子数据
```sql
INSERT INTO "DailyStats" (
  "date", "totalViews", "prevDayViewsChangePercent",
  "userCount", "paidUserCount", "userDelta", "paidUserDelta",
  "totalRevenue", "totalProfit"
) VALUES (
  DATE_TRUNC('day', NOW()), 0, '0',
  (SELECT count(*) FROM "User"),
  (SELECT count(*) FROM "User" WHERE "subscriptionStatus" = 'active'),
  (SELECT count(*) FROM "User"),
  (SELECT count(*) FROM "User" WHERE "subscriptionStatus" = 'active'),
  0, 0
) ON CONFLICT ("date") DO UPDATE SET
  "userCount" = EXCLUDED."userCount",
  "paidUserCount" = EXCLUDED."paidUserCount"
```

##### 3. 构建与部署
- **后端**: `wasp build` — 成功
- **前端**: `REACT_APP_API_URL=https://api.agentkm.com npx vite build` — 成功
- **同步构建产物**:
  ```bash
  rsync -avz --delete \
    app/.wasp/out/ \
    root@185.183.98.25:/opt/opensaas/server-build/
  rsync -avz --delete \
    app/.wasp/out/web-app/build/ \
    root@185.183.98.25:/opt/opensaas/client-build/
  ```
- **重建容器**: `docker compose build --no-cache server && docker compose up -d server client`

##### 4. 验证
- **Job 执行日志**:
  ```
  Plausible analytics not configured, using default page view values
  Daily stat found for today, updating it...
  ```
- **数据库**: DailyStats 表已有 1 条记录
- **API 调用**: `POST /operations/get-daily-stats` 返回 200，数据正常
- **前端页面**: Admin Dashboard 正常显示统计卡片

#### 技术要点
- **PgBoss Job 失败处理**: 即使 Job 部分功能失败（如 Analytics API 不可用），也应记录日志但不中断整体流程
- **默认值策略**: 对于可选的统计功能，未配置时应使用合理的默认值而不是抛出错误
- **环境变量检查**: 在生产环境中，必须确保所有必要的 API 环境变量已正确配置

#### 后续建议
- 如果后续需要启用 Plausible Analytics，需要在 docker-compose.yml 中添加环境变量：
  ```yaml
  environment:
    - PLAUSIBLE_API_KEY=xxx
    - PLAUSIBLE_SITE_ID=xxx
    - PLAUSIBLE_BASE_URL=https://plausible.agentkm.com
  ```
- 当前的实现允许在缺少 Analytics 配置的情况下正常运行，但统计数据将显示为 0

---

## 2026-04-12

### 操作模型
glm-5.1 (zhipuai-coding-plan/glm-5.1)

### 操作内容: Pricing 改版 — Step 1-8（后端代码改动）

按照 `dev_doc/TASK_LIST_PRICING.md` 任务清单，按顺序完成 Step 1 ~ Step 8。

#### Step 1 — plans.ts 计划定义重构
- **文件**: `app/src/payment/plans.ts`
- **变更**: 整体替换，移除 `Credits10` 枚举值和 `credits` kind，新增 `BillingCycle` 类型，`getPaymentProcessorPlanId` 签名改为接收 `billingCycle` 参数，新增 `trialDays` 字段（Hobby=30, Pro=14），`getPaymentPlanIdByPaymentProcessorPlanId` 遍历月付+年付两组 Price ID
- **验证**: `npx tsc --noEmit` 中 plans.ts 自身无报错

#### Step 2 — .env.server + .env.server.example 环境变量更新
- **文件**: `app/.env.server`, `app/.env.server.example`
- **变更**: 移除 `PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID`、`PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID`、`PAYMENTS_CREDITS_10_PLAN_ID`；新增 `PAYMENTS_HOBBY_MONTHLY_PLAN_ID`、`PAYMENTS_HOBBY_YEARLY_PLAN_ID`、`PAYMENTS_PRO_MONTHLY_PLAN_ID`、`PAYMENTS_PRO_YEARLY_PLAN_ID`（值待 Stripe Dashboard 配置后填入）

#### Step 3 — operations.ts 支付操作扩展 billingCycle
- **文件**: `app/src/payment/operations.ts`
- **变更**: Zod Schema 改为 `z.object({ planId, billingCycle })`，解构 `{ planId, billingCycle }`，`createCheckoutSession` 传入 `billingCycle`

#### Step 4 — checkoutUtils.ts 添加 trialPeriodDays 支持
- **文件**: `app/src/payment/stripe/checkoutUtils.ts`
- **变更**: `CreateStripeCheckoutSessionParams` 新增 `trialPeriodDays?: number`，`createStripeCheckoutSession` 中新增 `subscription_data` 条件逻辑，删除 `getInvoiceCreationConfig` 死代码函数

#### Step 5 — paymentProcessor.ts 接口新增 billingCycle
- **文件**: `app/src/payment/paymentProcessor.ts`
- **变更**: 导入 `BillingCycle`，`CreateCheckoutSessionArgs` 接口新增 `billingCycle: BillingCycle`

#### Step 6 — stripe/paymentProcessor.ts 适配新计划 + 删除死代码
- **文件**: `app/src/payment/stripe/paymentProcessor.ts`
- **变更**: `createStripeCheckoutSession` 传入 `trialPeriodDays: paymentPlan.trialDays`，`mode` 硬编码 `"subscription"`，`priceId` 使用 `paymentPlan.getPaymentProcessorPlanId(args.billingCycle)`，删除 `paymentPlanEffectToStripeCheckoutSessionMode` 函数和 `assertUnreachable` import
- **验证**: `npx tsc --noEmit` 此文件无报错

#### Step 7 — stripe/webhook.ts 移除 Credits10 分支
- **文件**: `app/src/payment/stripe/webhook.ts`
- **变更**: 删除 `case PaymentPlanId.Credits10:` 整个 case 块，移除 `updateUserCredits` import，保留 Hobby/Pro 的 `provisionZeroclawJob.submit` 逻辑和 `assertUnreachable` default
- **验证**: `npx tsc --noEmit` 此文件无报错

#### Step 8 — polar/webhook.ts + user.ts 清理遗留引用
- **文件**: `app/src/payment/polar/webhook.ts`
  - 删除 `case PaymentPlanId.Credits10:` case 块，移除 `updateUserCredits` import 和 `paymentPlans` import
- **文件**: `app/src/payment/user.ts`
  - 删除 `UpdateUserCreditsArgs` 接口和 `updateUserCredits` 函数
- **文件**: `app/src/payment/polar/paymentProcessor.ts`（最小修复）
  - 适配新的 `getPaymentProcessorPlanId(billingCycle)` 签名，从解构中新增 `billingCycle` 参数
- **文件**: `app/src/payment/lemonSqueezy/paymentProcessor.ts`（最小修复）
  - 适配新的 `getPaymentProcessorPlanId(billingCycle)` 签名
- **文件**: `app/src/payment/lemonSqueezy/webhook.ts`（最小修复）
  - 移除 `plan.effect.kind === "credits"` 判断（credits kind 已不存在）
  - `getPlanIdByVariantId` 中 `getPaymentProcessorPlanId()` 添加 `"monthly"` 参数
- **验证**: `npx tsc --noEmit` 后端所有文件无报错（仅剩 `PricingPage.tsx` 前端报错，将在 Step 9 修复）

#### 额外说明
- 文档标注 `lemonSqueezy/` 和 `polar/paymentProcessor.ts` 为 "Out of Scope"，但因 `getPaymentProcessorPlanId` 签名变更导致编译错误，按最小改动原则修复
- `polar/paymentProcessor.ts` 和 `lemonSqueezy/paymentProcessor.ts` 需要接收 `billingCycle` 参数（由接口 `CreateCheckoutSessionArgs` 新增字段要求），传入默认 `"monthly"` 即可

#### 待完成
- Step 11-12（E2E 测试更新、构建验证）需在后续会话执行

---

## 2026-04-12 (第三会话)

### 操作模型
glm-5.1 (zhipuai-coding-plan/glm-5.1)

### 操作内容: Pricing 改版 — Step 9-10（前端代码改动）

按照 `dev_doc/TASK_LIST_PRICING.md` 任务清单，按顺序完成 Step 9 ~ Step 10。

#### Step 9 — PricingPage.tsx 定价页面 UI 重构
- **文件**: `app/src/payment/PricingPage.tsx`
- **变更**:
  - 新增 `BillingCycle` import，新增 `billingCycle` state（默认 `"monthly"`）
  - `paymentPlanCards` 从 `Record<PaymentPlanId, PaymentPlanCard>` 改为 `Record<"free" | PaymentPlanId, PaymentPlanCard>`
  - 每个卡片含 `monthlyPrice` + `yearlyPrice`（Free: $0/$0, Hobby: $3.99/$9.99, Pro: $6.99/$16.99）
  - 卡片渲染顺序: `["free", PaymentPlanId.Hobby, PaymentPlanId.Pro]`
  - Free 卡片: 始终 $0 不受 Toggle 影响；未登录→"Get Started"→navigate("/signup")；已登录→"Current Plan" disabled
  - Hobby/Pro 卡片: 价格根据 billingCycle 切换 monthlyPrice/yearlyPrice，后缀切换 "/month"/"/year"
  - Toggle 组件: 两个 Button，默认选中 Monthly，Yearly 带副标签 "Save up to 80%"（绿色 text-xs）
  - `handleBuyNowClick` 签名改为 `(paymentPlanId: PaymentPlanId, billingCycle: BillingCycle)`
  - `generateCheckoutSession` 传入 `{ planId: paymentPlanId, billingCycle }`
  - 移除 Credits10 卡片配置
  - 页面描述更新为 Amigo 品牌文案
  - features 列表按附录 C 定义
- **同步 `.wasp/out/` 生成文件**:
  - 复制 12 个源文件到 `.wasp/out/sdk/wasp/src/payment/` 和 `.wasp/out/src/payment/`
  - 更新 6 个 `.d.ts` 类型声明文件（plans, operations, paymentProcessor, user, checkoutUtils, PricingPage）
- **验证**: `npx tsc --noEmit` 零错误，所有 checklist 项通过

#### Step 10 — AccountPage.tsx 移除 Buy More Credits
- **文件**: `app/src/user/AccountPage.tsx`
- **变更**:
  - 删除 `BuyMoreButton` 组件（原 Line 177-194）
  - 删除 Credits 区域中的 "Buy More Credits" 按钮（原 Line 79-81）
  - Credits 区域只保留标签和数值: `{user.credits} credits`（`sm:col-span-2`）
  - 移除不再需要的 import: `WaspRouterLink`, `routes`
  - `CustomerPortalButton` 和 `UserCurrentSubscriptionPlan` 功能不变
- **同步**: AccountPage.tsx 复制到 `.wasp/out/` 两目录
- **验证**: `npx tsc --noEmit` 零错误，所有 checklist 项通过

---

## 2026-04-12 (第四会话)

### 操作模型
glm-5.1 (zhipuai-coding-plan/glm-5.1)

### 操作内容: Pricing 改版 — Step 11-12（E2E 测试更新 + 构建验证）

按照 `dev_doc/TASK_LIST_PRICING.md` 任务清单，按顺序完成 Step 11 ~ Step 12。

#### Step 11 — E2E 测试更新

##### Step 11a — `e2e-tests/tests/utils.ts`
- **变更**:
  - `makeStripePayment` 的 `planId` 参数类型从 `"hobby" | "pro" | "credits10"` 改为 `"hobby" | "pro"`
  - 新增 `billingCycle?: "monthly" | "yearly"` 可选参数，默认 `"monthly"`
  - 删除 `if (planId === "credits10")` 分支（原 Line 130-132），统一断言为 `await expect(page.getByText(planId)).toBeVisible()`
  - 移除冗余注释（Stripe slow timeout 注释等）

##### Step 11b — `e2e-tests/tests/pricingPageTests.spec.ts`
- **变更**:
  - 删除整个 "Make test payment with Stripe for 10 credits" 测试用例（原 Line 79-85）
  - 移除不再需要的 `acceptAllCookies` import
  - 保留的测试用例: "Log In to Buy Plan button"、"Buy Plan button before payment"、"hobby plan payment"、"Manage Subscription button after payment"
  - `.first()` 选择器无需修改（Free 卡片不产生 "Log in to buy plan"/"Buy plan"/"Manage Subscription" 按钮，`.first()` 自动定位到 Hobby 卡片）

- **验证**: `npx tsc --noEmit` 零错误，`credits10` 关键词在两文件中均不存在

#### Step 12 — 构建验证 + 全局清理检查

##### 12.1 TypeScript 检查
- `npx tsc --noEmit` — 零错误 ✅

##### 12.2 全局关键词搜索
在 `app/src/` 和 `e2e-tests/` 中搜索 8 个关键词，确认代码中无残留：

| 关键词 | 结果 |
|--------|------|
| `Credits10` | ✅ 无残留 |
| `credits10` | ✅ 无残留 |
| `CREDITS_10` | ✅ 无残留 |
| `PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID` | ✅ 无残留 |
| `PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID` | ✅ 无残留 |
| `getInvoiceCreationConfig` | ✅ 无残留 |
| `paymentPlanEffectToStripeCheckoutSessionMode` | ✅ 无残留 |
| `updateUserCredits` | ✅ 无残留 |

##### 12.3 Wasp 构建
- `wasp build` — 成功 ✅

##### 12.4 Vite 前端构建
- `REACT_APP_API_URL=https://api.agentkm.com npx vite build` — 成功 ✅ (14.40s)
- 产物大小: index.js 1,330.86 kB (gzip: 395.84 kB), index.css 119.50 kB

#### Pricing 改版全部 12 步完成总结

| Step | 文件 | 状态 |
|------|------|------|
| 1 | plans.ts | ✅ 会话 1 完成 |
| 2 | .env.server + .env.server.example | ✅ 会话 1 完成 |
| 3 | operations.ts | ✅ 会话 1 完成 |
| 4 | checkoutUtils.ts | ✅ 会话 1 完成 |
| 5 | paymentProcessor.ts | ✅ 会话 1 完成 |
| 6 | stripe/paymentProcessor.ts | ✅ 会话 1 完成 |
| 7 | stripe/webhook.ts | ✅ 会话 1 完成 |
| 8 | polar/webhook.ts + user.ts + lemonSqueezy 最小修复 | ✅ 会话 1 完成 |
| 9 | PricingPage.tsx | ✅ 会话 2 完成 |
| 10 | AccountPage.tsx | ✅ 会话 2 完成 |
| 11 | utils.ts + pricingPageTests.spec.ts | ✅ 本次会话完成 |
| 12 | 构建验证 + 全局清理 | ✅ 本次会话完成 |

#### 待部署
- 构建产物已就绪（`.wasp/out/`），需 `git push` 触发自动部署
- 服务器 docker-compose.yml 环境变量需同步更新（4 个新 `PAYMENTS_*_MONTHLY/YEARLY_PLAN_ID`）
- Stripe Dashboard 需创建 4 个新 Price 并填入 Price ID
