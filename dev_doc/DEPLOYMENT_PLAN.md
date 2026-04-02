# OpenSaaS + ZeroClaw 多用户自动开通 · 完整架构方案

> **方案 A · 原生进程 + systemd** | 严禁修改 ZeroClaw 源码 | 支持从 GitHub 持续更新
>
> 边界：仅可修改 Server A 的 OpenSaaS 代码；Server B 只部署管控层，ZeroClaw 二进制直接从 GitHub Release 下载

---

## 目录

- [1. 架构总览](#1-架构总览)
- [2. 设计原则与边界约束](#2-设计原则与边界约束)
- [3. 两台服务器职责划分](#3-两台服务器职责划分)
- [4. Server A 改动清单（OpenSaaS 侧）](#4-server-a-改动清单opensaas-侧)
- [5. Server B 完整架构（ZeroClaw 宿主机）](#5-server-b-完整架构zeroclaw-宿主机)
- [6. 端到端业务流程](#6-端到端业务流程)
- [7. ZeroClaw 持续更新机制](#7-zeroclaw-持续更新机制)
- [8. 安全设计](#8-安全设计)
- [9. 容量规划与资源估算](#9-容量规划与资源估算)
- [10. 逐步部署指令](#10-逐步部署指令)
- [11. 日常运维手册](#11-日常运维手册)
- [12. 故障排查指南](#12-故障排查指南)

---

## 1. 架构总览

```
┌──────────────────────────────────────────┐       ┌───────────────────────────────────────────────────┐
│         Server A (agentkm.com)            │       │         Server B (zeroclaw.example.com)            │
│         OpenSaaS + Wasp + Stripe          │       │                                                   │
│                                           │       │  ┌─────────────────────────────────────────────┐  │
│  ┌─────────────────────────────────────┐  │       │  │  Provisioning API (Node.js/Express)         │  │
│  │  React 前端                          │  │       │  │                                             │  │
│  │  · 登录 / 注册 / 定价页 / 账户页     │  │       │  │  POST /api/provision      开通实例           │  │
│  │  · ZeroClaw 管理面板 (新增)          │  │ HTTPS │  │  POST /api/deprovision    注销实例           │  │
│  │  · Stripe Checkout                   │──┼──────►│  │  GET  /api/instances/:id  查询状态           │  │
│  └─────────────────────────────────────┘  │  API   │  │  POST /api/instances/:id/config  更新配置   │  │
│                                           │  Key   │  │  POST /api/update-all     批量更新二进制     │  │
│  ┌─────────────────────────────────────┐  │       │  │  GET  /api/health         健康检查           │  │
│  │  Express 后端                        │  │       │  └────────────────┬────────────────────────────┘  │
│  │  · Stripe Webhook 处理               │  │       │                   │                               │
│  │  · 用户管理                          │  │       │                   ▼                               │
│  │  · Provisioning Client (新增)        │  │       │  ┌────────────────────────────────────────────┐   │
│  │  · PgBoss Job: 自动开通 (新增)       │  │       │  │  systemd 进程管理                          │   │
│  └─────────────────────────────────────┘  │       │  │                                            │   │
│                                           │       │  │  zeroclaw@u001.service  → 127.0.0.1:42618  │   │
│  ┌─────────────────────────────────────┐  │       │  │  zeroclaw@u002.service  → 127.0.0.1:42619  │   │
│  │  PostgreSQL                          │  │       │  │  zeroclaw@u00N.service  → 127.0.0.1:42617+N│   │
│  │  · User 表 (现有)                    │  │       │  │                                            │   │
│  │  · ZeroclawInstance 表 (新增)        │  │       │  │  全部由 /opt/zeroclaw/bin/zeroclaw 启动     │   │
│  └─────────────────────────────────────┘  │       │  │  全部归入 agent.slice (cgroup v2 资源限制)   │   │
│                                           │       │  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────┘       │                                                   │
                                                   │  Nginx 反向代理 (SSL by Let's Encrypt)            │
                                                   │  /u001/ → 127.0.0.1:42618/u001/                  │
                                                   │  /u002/ → 127.0.0.1:42619/u002/                  │
                                                   └───────────────────────────────────────────────────┘
```

### 核心思路一句话

用户在 Server A 支付 → Stripe Webhook → PgBoss 异步 Job → HTTPS 调用 Server B 的 Provisioning API → Server B 创建独立 config + 启动 systemd 模板 unit → 用户通过 Nginx 访问自己的 ZeroClaw Dashboard。

---

## 2. 设计原则与边界约束

### 2.1 严格边界

| 边界 | 规则 |
|------|------|
| ZeroClaw 源码 | **严禁修改**，ZeroClaw 代码目录 (`/root/下载/zeroclaw-master`) 仅作为参考阅读 |
| ZeroClaw 二进制 | 直接从作者 GitHub Release 下载预编译二进制，或从源码编译后以二进制形式部署 |
| Server B 更新 | 仅替换 `/opt/zeroclaw/bin/` 下的二进制文件 + symlink，`git pull` 只作用于独立的源码仓库（如需本地编译） |
| OpenSaaS 代码 | **可以修改**，所有 SaaS 逻辑在 Server A 端完成 |
| Server B 管控层 | Provisioning API 是独立项目，与 ZeroClaw 源码完全无关 |

### 2.2 为什么不用 Docker

| 对比维度 | 原生进程 + systemd | Docker |
|----------|-------------------|--------|
| 内存开销 | 0（无守护进程） | 50-100 MB（docker daemon） |
| 4c/8G 可承载 | 250-350 实例 | ~100 实例 |
| 启停速度 | 毫秒级 | 秒级（容器创建开销） |
| ZeroClaw 隔离 | `workspace_only=true` + cgroup v2 + 独立 config 目录 | 完整容器隔离 |
| 网络隔离 | 无（localhost 可互通，可信用户场景可接受） | 完整网络命名空间 |
| 运维复杂度 | 低（systemd 原生） | 中（需维护镜像、容器编排） |

### 2.3 核心设计决策

1. **共享单份二进制**：`/opt/zeroclaw/bin/zeroclaw` 仅 8.8 MB，所有用户实例共享同一份只读二进制
2. **独立数据目录**：通过 `ZEROCLAW_CONFIG_DIR` 环境变量指向每用户的独立目录
3. **systemd 模板 unit**：`zeroclaw@.service` 中 `%i` 自动替换为实例 ID，一个模板服务所有用户
4. **路径前缀路由**：ZeroClaw 原生支持 `path_prefix`，Nginx 按路径前缀转发到对应端口
5. **BYOK (Bring Your Own Key)**：用户自带 LLM API Key，运营零 LLM 成本

---

## 3. 两台服务器职责划分

### Server A · agentkm.com（现有 OpenSaaS）

| 组件 | 职责 |
|------|------|
| React 前端 | 用户注册/登录、定价页、Stripe Checkout、ZeroClaw 管理面板 |
| Express 后端 | Stripe Webhook 处理、Provisioning Client（调用 Server B）、用户管理 |
| PostgreSQL | 用户数据、订阅状态、`ZeroclawInstance` 实例记录 |
| PgBoss | 异步任务队列（开通/注销 ZeroClaw 实例的 Job） |

### Server B · zeroclaw.example.com（ZeroClaw 宿主机）

| 组件 | 职责 |
|------|------|
| Provisioning API (Node.js) | 接收 Server A 的开通/注销请求，管理 systemd 服务和 Nginx 配置 |
| systemd | 进程管理、cgroup v2 资源限制、自动重启 |
| Nginx | HTTPS 反向代理，按路径前缀路由到各 ZeroClaw 实例 |
| ZeroClaw 二进制 | 从 GitHub Release 下载，所有用户实例共享 |
| 每用户数据目录 | 独立 config.toml + workspace + SQLite 记忆数据库 |

---

## 4. Server A 改动清单（OpenSaaS 侧）

### 4.1 数据库：新增 ZeroclawInstance 模型

在 `schema.prisma` 中 User 模型添加一对 one-to-one 关联字段，并新增 `ZeroclawInstance` 模型。

**ZeroclawInstance 模型字段设计：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID (PK) | 主键 |
| userId | String (unique) | 关联 User，一对一 |
| instanceId | String (unique) | 实例标识，如 "u001"、"u002" |
| numericId | Int (unique) | 数字编号，用于端口计算 (42617 + numericId) |
| status | String | provisioning / active / stopped / suspended / failed / deleting |
| port | Int | 分配的端口号 |
| dashboardUrl | String? | 用户访问 Dashboard 的完整 URL |
| pathPrefix | String | Nginx 路径前缀，如 "/u001" |
| provider | String | 用户选择的 LLM Provider，默认 "openrouter" |
| userApiKeyEncrypted | String? | 用户的 LLM API Key（加密存储） |
| zeroclawVersion | String? | 当前运行的 ZeroClaw 版本号 |
| lastHealthCheck | DateTime? | 最后一次健康检查时间 |
| provisioningError | String? | 开通失败时的错误信息 |

迁移指令：

```
cd app && npx prisma migrate dev --name add_zeroclaw_instance
```

### 4.2 新增文件清单

| 文件路径 | 职责 |
|----------|------|
| `src/zeroclaw/portAllocator.ts` | 端口分配器 — 查询已占用的 numericId，找到最小可用 ID |
| `src/zeroclaw/provisioning.ts` | Server B API 调用客户端 — provision / deprovision / getStatus / updateConfig，使用 HMAC-SHA256 签名认证 |
| `src/zeroclaw/provisioningJob.ts` | PgBoss 异步 Job — 执行完整开通流程（分配端口 → 创建 DB 记录 → 调用 Server B → 更新状态） |
| `src/zeroclaw/operations.ts` | Wasp Query + Action — getZeroclawInstance / setZeroclawApiKey / retryProvision |
| `src/zeroclaw/ZeroclawPage.tsx` | 前端管理页面 — 实例状态展示、Dashboard 跳转链接、API Key 配置表单 |

### 4.3 需要修改的现有文件

| 文件 | 修改内容 |
|------|----------|
| `schema.prisma` | 添加 ZeroclawInstance 模型，User 模型添加关联字段 |
| `main.wasp` | 添加：provisionZeroclawJob (job)、ZeroclawRoute + ZeroclawPage (route + page)、getZeroclawInstance (query)、setZeroclawApiKey + retryProvision (action) |
| `src/payment/stripe/webhook.ts` | 在 `handleInvoicePaid` 中：订阅支付成功后提交 `provisionZeroclawJob`；在 `handleCustomerSubscriptionDeleted` 中：调用 `deprovisionInstance` 停止 Server B 上的实例 |
| `.env.server` | 添加 SERVER_B_API_URL、SERVER_B_API_KEY、ZEROCLOW_DASHBOARD_BASE_URL、ZEROCLOW_BASE_PORT、ZEROCLOW_MAX_PORT |

### 4.4 端口分配算法

- 基础端口：42618（即 BASE_PORT）
- 每个用户分配递增 numericId：1, 2, 3, ...
- 实际端口 = 42617 + numericId
- 分配时查询 ZeroclawInstance 表中 status ≠ "deleting" 的所有 numericId，取最小未使用的值
- 端口范围：42618 ~ 65535，理论最大 22917 个实例

### 4.5 Provisioning Client 认证机制

Server A 调用 Server B 的每个请求都携带：

| Header | 值 | 说明 |
|--------|------|------|
| X-Timestamp | 当前时间戳（毫秒） | 防重放攻击 |
| X-Signature | HMAC-SHA256(secret, timestamp) | 身份验证 |
| Content-Type | application/json | 请求体格式 |

Server B 验证逻辑：
1. 检查 timestamp 与当前时间偏差不超过 5 分钟
2. 用相同的 secret 重新计算 HMAC-SHA256 签名
3. 使用 constant-time comparison 防止时序攻击

### 4.6 PgBoss Job：provisionZeroclawJob

**输入参数：** `{ userId: string }`

**执行步骤：**

1. 检查该用户是否已有实例（避免重复开通）
2. 调用 `allocatePort()` 获取可用端口和 numericId
3. 计算 instanceId（如 "u001"）、pathPrefix（如 "/u001"）、dashboardUrl
4. 在数据库创建 ZeroclawInstance 记录，状态为 "provisioning"
5. 调用 Server B 的 `POST /api/provision`
6. 成功后更新状态为 "active"，失败则更新为 "failed" 并记录错误
7. 失败时 PgBoss 会自动重试

---

## 5. Server B 完整架构（ZeroClaw 宿主机）

### 5.1 目录结构

```
/opt/zeroclaw/
├── bin/
│   ├── zeroclaw                  ← symlink，始终指向当前版本
│   ├── zeroclaw-0.8.2            ← 旧版本（保留用于回滚）
│   └── zeroclaw-0.8.3            ← 当前版本
│
├── data/
│   └── users/
│       ├── u001/
│       │   ├── config.toml       ← 该用户的 ZeroClaw 配置
│       │   └── workspace/        ← 该用户的独立工作空间（ZeroClaw 自动生成子目录）
│       ├── u002/
│       └── u00N/
│
├── provisioning/
│   ├── package.json              ← Express 依赖
│   ├── .env                      ← API Key 等敏感配置
│   └── src/
│       ├── index.ts              ← Express 入口，路由定义
│       ├── auth.ts               ← HMAC-SHA256 请求验证中间件
│       ├── systemd.ts            ← systemd 服务管理（启停、状态查询、配置更新）
│       ├── nginx.ts              ← Nginx 路由配置生成和删除
│       ├── config.ts             ← config.toml 模板渲染
│       └── health.ts             ← 健康检查逻辑
│
├── updates/
│   └── update-all.sh             ← 一键更新所有实例的 ZeroClaw 二进制
│
└── logs/
    ├── provisioning.log          ← Provisioning API 日志
    └── update.log                ← 更新脚本日志
```

### 5.2 关键原理：ZEROCLAW_CONFIG_DIR 环境变量

ZeroClaw 源码中的配置加载逻辑（`config/schema.rs`）支持通过 `ZEROCLAW_CONFIG_DIR` 环境变量指定配置目录。设置此变量后：

- 配置文件路径：`{ZEROCLAW_CONFIG_DIR}/config.toml`
- 工作空间路径：`{ZEROCLAW_CONFIG_DIR}/workspace/`

这意味着每个 systemd 实例只需要通过环境变量指向不同的目录，就实现了完全隔离，**无需修改 ZeroClaw 任何代码**。

### 5.3 systemd 模板 unit 设计

**文件路径：** `/etc/systemd/system/zeroclaw@.service`

**关键配置说明：**

| 配置项 | 值 | 说明 |
|--------|------|------|
| ExecStart | `/opt/zeroclaw/bin/zeroclaw daemon` | 使用 symlink 路径，更新时无需修改 unit |
| Environment: ZEROCLAW_CONFIG_DIR | `/opt/zeroclaw/data/users/%i` | `%i` 自动替换为实例 ID，如 "u001" |
| Environment: HOME | `/opt/zeroclaw/data/users/%i` | ZeroClaw 需要 HOME 目录 |
| WorkingDirectory | `/opt/zeroclaw/data/users/%i` | 进程工作目录 |
| User / Group | `agent` / `agent` | 统一低权限运行用户 |
| Restart | on-failure | 进程异常退出自动重启 |
| RestartSec | 5 | 重启间隔 5 秒 |
| MemoryMax | 256M | cgroup v2 内存硬上限 |
| MemorySwapMax | 0 | 禁止使用 swap |
| CPUQuota | 50% | CPU 时间配额上限 |
| TasksMax | 64 | 最大线程/进程数 |
| Slice | agent.slice | 归入统一 cgroup slice |
| SyslogIdentifier | zeroclaw-%i | 日志标识，便于 journalctl 过滤 |

**agent.slice 作用：** 将所有 ZeroClaw 实例归入同一个 cgroup slice，可以：
- 统一查看所有实例的总资源占用：`systemd-cgtop` 查看 agent.slice
- 设置 slice 级别的总资源上限（防止所有实例吃光系统资源）
- 批量操作：`systemctl stop 'zeroclaw@*'`

### 5.4 ZeroClaw config.toml 模板设计

为每个用户渲染的配置文件包含以下关键设置：

| 配置段 | 配置项 | 值 | 说明 |
|--------|--------|------|------|
| 顶层 | default_provider | "openrouter" | 默认 LLM Provider（用户可改） |
| 顶层 | api_key | "" | 初始为空，用户通过 Dashboard 设置后填入 |
| [gateway] | port | 42617 + numericId | 每用户独立端口 |
| [gateway] | host | "127.0.0.1" | 仅本机监听，由 Nginx 反代 |
| [gateway] | path_prefix | "/u001" | ZeroClaw 原生支持路径前缀 |
| [gateway] | require_pairing | false | SaaS 场景下不需要 pairing |
| [gateway] | allow_public_bind | true | 配合 Nginx 使用 |
| [autonomy] | workspace_only | true | **关键安全设置**：禁止文件越权访问 |
| [autonomy] | allowed_commands | git, curl, grep | Shell 命令白名单 |
| [cost] | enabled | true | 启用成本控制 |
| [cost] | daily_limit_usd | 5.00 | 每日花费上限 5 美元 |
| [cost] | monthly_limit_usd | 50.00 | 每月花费上限 50 美元 |
| [memory] | backend | "sqlite" | SQLite 记忆存储 |
| [memory] | auto_save | true | 自动保存对话记忆 |
| [browser] | enabled | false | 禁用内置浏览器（节省内存） |

### 5.5 Nginx 反向代理设计

**主配置：** `/etc/nginx/sites-available/default`

- 监听 443 SSL（Let's Encrypt 证书）
- `/api/` 路径代理到 Provisioning API（127.0.0.1:3100）
- 包含 `/etc/nginx/zeroclaw-routes/*.conf` 动态路由目录

**动态路由（每用户一个配置文件）：**

每个用户开通时，在 `/etc/nginx/zeroclaw-routes/` 目录下生成一个配置文件（如 `u001.conf`），内容为 location 块：

- 路径：`/u001/`
- 代理到：`http://127.0.0.1:42618/u001/`
- 支持 WebSocket 升级（`proxy_set_header Upgrade`）
- 长连接超时 86400 秒（WebSocket 需要）

用户注销时删除对应配置文件并 reload Nginx。

### 5.6 Provisioning API 路由设计

| 方法 | 路径 | 认证 | 功能 |
|------|------|------|------|
| GET | /api/health | 无 | 返回系统健康状态（实例总数、运行数、内存用量、ZeroClaw 版本） |
| POST | /api/provision | HMAC | 开通实例：创建目录 → 写 config.toml → 启动 systemd → 等待健康检查 → 生成 Nginx 路由 → reload Nginx |
| POST | /api/deprovision | HMAC | 注销实例：停止 systemd → 删除 Nginx 路由 → reload Nginx（保留数据目录用于恢复） |
| GET | /api/instances/:id | HMAC | 查询实例状态：systemd ActiveState、PID、内存占用、端口 |
| POST | /api/instances/:id/config | HMAC | 更新实例配置：修改 config.toml 中的 api_key / provider → 重启 systemd |
| POST | /api/update-all | Admin Key | 批量更新：异步执行 update-all.sh 脚本 |

**Provisioning API 本身也作为 systemd 服务运行**：`/etc/systemd/system/provisioning.service`，以 root 用户运行（需要执行 systemctl 命令）。

---

## 6. 端到端业务流程

### 6.1 正常开通流程（用户首次订阅）

```
步骤 1: 用户注册
  用户 → agentkm.com/signup → Wasp Auth → User 记录创建（subscriptionStatus=null）

步骤 2: 浏览定价页
  用户 → agentkm.com/pricing → 展示 Hobby ($9.99/mo) / Pro ($19.99/mo) 方案

步骤 3: 点击购买
  前端调用 generateCheckoutSession({ planId: "pro" })
  → 后端创建 Stripe Checkout Session
  → 返回 sessionUrl，前端跳转到 Stripe 支付页面

步骤 4: 用户在 Stripe 完成支付
  Stripe 处理信用卡支付 → 支付成功

步骤 5: Stripe Webhook（invoice.paid）
  Stripe → POST agentkm.com/payments-webhook
  → 后端验证 Stripe 签名
  → handleInvoicePaid() 处理支付事件
  → 更新 User.subscriptionStatus = "active"
  → 提交 PgBoss Job: provisionZeroclawJob({ userId })

步骤 6: PgBoss Job 异步执行开通
  provisionZeroclawForUser({ userId }) 执行：
    a. 检查是否已存在实例（防止重复）
    b. allocatePort() → { port: 42618, numericId: 1 }
    c. 计算 instanceId = "u001", pathPrefix = "/u001"
    d. 创建 ZeroclawInstance 记录（status = "provisioning"）
    e. POST Server B /api/provision（携带 HMAC 签名）

步骤 7: Server B 执行开通
  Provisioning API 收到请求后：
    a. 创建 /opt/zeroclaw/data/users/u001/ 和 workspace 子目录
    b. 渲染并写入 config.toml（port=42618, path_prefix="/u001"）
    c. 执行 systemctl enable --now zeroclaw@u001
    d. 轮询 http://127.0.0.1:42618/u001/health 等待启动（最多 30 秒）
    e. 生成 /etc/nginx/zeroclaw-routes/u001.conf
    f. 执行 nginx -s reload
    g. 返回 { success: true, dashboardUrl: "https://zeroclaw.example.com/u001/" }

步骤 8: 更新数据库
  PgBoss Job 收到成功响应后：
    → 更新 ZeroclawInstance（status = "active", dashboardUrl）

步骤 9: 用户访问 ZeroClaw Dashboard
  用户在 agentkm.com/zeroclaw 页面看到：
    - 实例状态：active（绿色）
    - Dashboard URL：https://zeroclaw.example.com/u001/
    - 点击跳转即可使用

步骤 10: 用户配置 LLM API Key
  用户在管理面板选择 Provider（如 OpenRouter）并输入 API Key
  → 前端调用 setZeroclawApiKey({ provider, apiKey })
  → 后端调用 Server B /api/instances/u001/config
  → Server B 修改 config.toml 中的 api_key 和 default_provider
  → Server B 执行 systemctl restart zeroclaw@u001
  → 用户即可开始与自己的 AI Agent 对话
```

### 6.2 取消订阅流程

```
Stripe → customer.subscription.deleted 事件
→ Server A: handleCustomerSubscriptionDeleted()
  → 更新 User.subscriptionStatus = "deleted"
  → 更新 ZeroclawInstance.status = "suspended"
  → POST Server B /api/deprovision { instanceId: "u001" }
  → Server B:
    - systemctl stop zeroclaw@u001
    - systemctl disable zeroclaw@u001
    - 删除 Nginx 路由配置
    - nginx -s reload
    - 保留 /opt/zeroclaw/data/users/u001/ 数据目录（用于恢复）
```

### 6.3 续费恢复流程

```
Stripe → invoice.paid（续费）
→ Server A: handleInvoicePaid()
  → 更新 User.subscriptionStatus = "active"
  → 检查 ZeroclawInstance 已存在且 status = "suspended"
  → POST Server B /api/provision（复用原有数据目录和端口）
  → Server B:
    - systemctl enable --now zeroclaw@u001（数据目录和 config.toml 仍在）
    - 恢复 Nginx 路由
    - 返回 dashboardUrl
  → ZeroclawInstance.status = "active"
```

### 6.4 开通失败重试流程

```
用户在管理页面看到状态为 "failed"
→ 点击 "重新开通" 按钮
→ 调用 retryProvision()
  → 检查 ZeroclawInstance.status === "failed"
  → 重新提交 PgBoss Job: provisionZeroclawJob({ userId })
  → Job 会复用已有的 numericId 和端口
```

---

## 7. ZeroClaw 持续更新机制

### 7.1 二进制版本管理策略

```
/opt/zeroclaw/bin/
├── zeroclaw                  ← symlink（始终指向当前版本）
│                               systemd unit 中 ExecStart 使用此路径
│                               更新时只需替换 symlink，无需修改任何 unit 文件
│
├── zeroclaw-0.8.2            ← 旧版本（保留用于紧急回滚）
├── zeroclaw-0.8.3            ← 当前版本（symlink 指向这里）
└── zeroclaw-0.9.0            ← 下次更新下载的新版本
```

**核心优势：** systemd unit 中的 `ExecStart=/opt/zeroclaw/bin/zeroclaw daemon` 始终通过 symlink 间接引用。更新流程：
1. 下载新版本二进制
2. 替换 symlink 指向新版本
3. 逐个 `systemctl restart zeroclaw@u*`
4. 所有实例立即使用新二进制，**无需修改任何配置**

### 7.2 一键更新脚本逻辑（update-all.sh）

**脚本路径：** `/opt/zeroclaw/updates/update-all.sh`

**执行流程：**

1. **获取最新版本号**：调用 GitHub API `https://api.github.com/repos/zeroclaw-labs/zeroclaw/releases/latest` 获取 tag_name
2. **比较版本**：如果已是最新版，直接退出
3. **下载新版本**：根据服务器架构（x86_64 或 aarch64）下载对应的 tar.gz
4. **验证二进制**：执行 `zeroclaw --version` 确认二进制可用
5. **替换 symlink**：`ln -sf /opt/zeroclaw/bin/zeroclaw-{新版本} /opt/zeroclaw/bin/zeroclaw`
6. **滚动重启**：遍历所有 `systemctl list-units 'zeroclaw@*'` 的运行中实例，逐个 restart 并检查启动状态
7. **清理旧版本**：保留最近 3 个版本，删除更早的
8. **日志记录**：全程输出到 `/opt/zeroclaw/logs/update.log`

**回滚方式：** 如果新版本有问题，只需将 symlink 指回旧版本，再执行滚动重启。

### 7.3 更新触发方式

| 方式 | 说明 |
|------|------|
| 定时 cron | 每天凌晨 3 点自动执行 update-all.sh（适合稳定期） |
| 手动 API | 管理员调用 `POST /api/update-all`（适合紧急更新） |
| SSH 手动 | 直接在 Server B 上执行 update-all.sh（适合调试） |

### 7.4 保证不破坏 ZeroClaw 更新的措施

| 措施 | 说明 |
|------|------|
| 只替换二进制文件 | 不修改 ZeroClaw 的任何配置文件或数据目录 |
| config.toml 兼容 | ZeroClaw 对未知配置项默认忽略，新版本新增的配置项不会导致旧配置文件报错 |
| 滚动重启 | 逐个重启实例，失败时记录但不影响其他实例 |
| 版本保留 | 保留最近 3 个版本的二进制，可随时回滚 |
| 无 git pull | Server B 上不 clone ZeroClaw 源码仓库，只下载 Release 二进制，完全不干扰作者仓库 |

---

## 8. 安全设计

### 8.1 Server A → Server B 通信安全

| 安全措施 | 实现方式 |
|----------|----------|
| 身份认证 | HMAC-SHA256 签名（共享密钥 + 时间戳） |
| 防重放攻击 | 时间戳偏差超过 5 分钟拒绝 |
| 防时序攻击 | constant-time comparison 验证签名 |
| 传输加密 | HTTPS（Let's Encrypt） |
| 防火墙 | Server B 仅开放 80/443，Provisioning API 端口 3100 仅监听 127.0.0.1 |

### 8.2 用户实例间隔离

| 隔离维度 | 实现方式 | 对应 ZeroClaw 配置 |
|----------|----------|-------------------|
| 文件系统 | `workspace_only=true` | `[autonomy] workspace_only` |
| 进程资源 | cgroup v2（MemoryMax, CPUQuota） | systemd unit 配置 |
| 数据目录 | 每用户独立 `/data/users/u{id}/` | `ZEROCLAW_CONFIG_DIR` 环境变量 |
| 配置文件 | 每用户独立 `config.toml` | `ZEROCLAW_CONFIG_DIR` 环境变量 |
| API Key | 每用户独立，AES-256 加密存储 | ZeroClaw 自动加密 `[secrets] encrypt` |
| 网络 | 仅 127.0.0.1 监听 | `[gateway] host="127.0.0.1"` |
| Shell 命令 | 白名单机制 | `[autonomy] allowed_commands` |
| 成本控制 | 每日/每月花费上限 | `[cost] daily_limit_usd, monthly_limit_usd` |
| 禁止路径 | /etc, /root, ~/.ssh 等系统目录 | ZeroClaw 内置 `forbidden_paths` |

### 8.3 安全清单

部署前必须确认：

- [ ] `PROVISIONING_API_KEY` 使用 `openssl rand -hex 32` 生成，不写入 Git 仓库
- [ ] 每个用户的 config.toml 权限设置为 600（仅 owner 可读写）
- [ ] Server B 配置 Let's Encrypt HTTPS 证书
- [ ] Server B 防火墙仅开放 80/443 给公网
- [ ] Provisioning API（端口 3100）仅监听 127.0.0.1
- [ ] agent 用户为系统用户（`/bin/false` shell），禁止 SSH 登录
- [ ] Provisioning API 日志记录所有 provision/deprovision 操作
- [ ] 用户 API Key 在数据库中加密存储（AES-256）

---

## 9. 容量规划与资源估算

### 9.1 单个 ZeroClaw 实例资源消耗

| 资源 | 典型值 | 上限（cgroup 限制） | 说明 |
|------|--------|---------------------|------|
| 内存 | 30-50 MB | 256 MB | daemon 模式闲时约 30MB |
| CPU | <5% 闲时 | 50% | LLM API 调用为主，CPU 消耗低 |
| 磁盘 | ~50 MB 初始 | ~200 MB 峰值 | 含 workspace、SQLite 记忆、skills |
| 端口 | 1 个 | — | 42617 + numericId |
| 进程 | 1 个 | 64 (TasksMax) | Rust 单进程，多 tokio 任务 |

### 9.2 服务器容量推荐

| 服务器规格 | 最大实例数 | 推荐用途 |
|-----------|-----------|----------|
| 2c/4G/40G SSD | ~60 | 测试/小规模 |
| **4c/8G/80G SSD** | **~128** | **推荐起步配置** |
| 4c/16G/160G SSD | ~256 | 100+ 活跃用户 |
| 8c/32G/320G SSD | ~512 | 大规模部署 |

### 9.3 200 用户磁盘用量估算（80G SSD）

| 项目 | 大小 |
|------|------|
| OS + 系统软件 | ~12 GB |
| ZeroClaw 二进制（1 份共享） | ~10 MB |
| Provisioning API (Node.js) | ~50 MB |
| 200 用户数据目录 × 100 MB | ~20 GB |
| Nginx + SSL 证书 | ~200 MB |
| **合计** | **~33 GB** |
| **剩余可用** | **~47 GB** |

### 9.4 扩展策略

当单台 Server B 容量不足时：

1. **垂直扩展**：升级 Server B 硬件（最简单）
2. **水平扩展**：新增 Server C/D，按用户 ID 分片（需要修改 Provisioning Client 增加路由逻辑）
3. **混合扩展**：不同规格服务器混合使用，按用户套餐分配（Pro 用户分配到高配服务器）

---

## 10. 逐步部署指令

### 10.1 Server B 初始化（从零开始）

**前提：** 一台干净的 Linux 服务器（推荐 Ubuntu 22.04/24.04）

**步骤 1：安装基础软件**

```
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx nodejs npm
```

**步骤 2：创建运行用户和目录结构**

```
useradd -r -s /bin/false agent

mkdir -p /opt/zeroclaw/{bin,data/users,provisioning/src,logs,updates}
mkdir -p /etc/nginx/zeroclaw-routes

chown -R agent:agent /opt/zeroclaw/data
```

**步骤 3：下载 ZeroClaw 二进制**

- 从 GitHub Releases 页面下载对应架构的 tar.gz
- 解压后放入 `/opt/zeroclaw/bin/zeroclaw-{版本号}`
- 设置执行权限：`chmod +x`
- 创建 symlink：`ln -sf /opt/zeroclaw/bin/zeroclaw-{版本号} /opt/zeroclaw/bin/zeroclaw`
- 验证：`/opt/zeroclaw/bin/zeroclaw --version`

**步骤 4：创建 systemd 模板 unit**

在 `/etc/systemd/system/zeroclaw@.service` 写入以下配置：

- Unit 段：Description, After=network.target
- Service 段：Type=simple, ExecStart 指向 symlink 路径, Environment 设置 ZEROCLAW_CONFIG_DIR 和 HOME, User/Group=agent, Restart=on-failure, 资源限制（MemoryMax=256M, CPUQuota=50%, TasksMax=64, Slice=agent.slice）
- Install 段：WantedBy=multi-user.target

**步骤 5：创建 agent.slice**

在 `/etc/systemd/system/agent.slice` 写入：
- Unit 段：Description, Before=slices.target
- Slice 段：CPUAccounting=yes, MemoryAccounting=yes

然后执行：`systemctl daemon-reload`

**步骤 6：配置 SSL 证书**

```
certbot --nginx -d zeroclaw.example.com --non-interactive --agree-tos -m admin@example.com
```

**步骤 7：配置 Nginx 主配置**

在 `/etc/nginx/sites-available/default` 中配置：
- 443 端口 SSL server block
- `/api/` 路径代理到 127.0.0.1:3100（Provisioning API）
- `include /etc/nginx/zeroclaw-routes/*.conf`（动态路由）
- 默认路径返回 404
- 80 端口重定向到 HTTPS

验证并重载：`nginx -t && systemctl reload nginx`

**步骤 8：部署 Provisioning API**

在 `/opt/zeroclaw/provisioning/` 下：
- 初始化 npm 项目，安装 express 依赖
- 部署 src/ 下的源码文件（index.ts, auth.ts, systemd.ts, nginx.ts, config.ts, health.ts）
- 创建 .env 文件，包含 PROVISIONING_PORT、PROVISIONING_API_KEY、ADMIN_KEY、ZEROCLOW_BINARY、DATA_DIR、DOMAIN
- 创建 systemd service：`/etc/systemd/system/provisioning.service`（以 root 运行，WorkingDirectory 指向项目目录）
- 启动：`systemctl enable --now provisioning`

**步骤 9：部署更新脚本**

将 `update-all.sh` 放入 `/opt/zeroclaw/updates/`，设置可执行权限。

**步骤 10：（可选）设置定时更新 cron**

```
crontab -e
# 添加：每天凌晨 3 点检查更新
0 3 * * * /opt/zeroclaw/updates/update-all.sh >> /opt/zeroclaw/logs/update.log 2>&1
```

**步骤 11：配置防火墙**

```
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

端口 3100 不需要开放（仅监听 127.0.0.1）。

**步骤 12：记录密钥**

保存以下信息，稍后配置到 Server A：
- PROVISIONING_API_KEY
- ADMIN_KEY
- Server B 域名

### 10.2 Server A 更新

**步骤 1：更新数据库 Schema**

在 `schema.prisma` 中添加 ZeroclawInstance 模型和 User 关联字段，然后：

```
cd app && npx prisma migrate dev --name add_zeroclaw_instance
```

**步骤 2：添加新文件**

在 `src/zeroclaw/` 目录下创建以下文件：
- portAllocator.ts
- provisioning.ts
- provisioningJob.ts
- operations.ts
- ZeroclawPage.tsx

**步骤 3：修改现有文件**

- `main.wasp`：添加 job、route、page、query、action 声明
- `src/payment/stripe/webhook.ts`：在 handleInvoicePaid 和 handleCustomerSubscriptionDeleted 中添加 ZeroClaw 开通/注销逻辑
- `.env.server`：添加 SERVER_B_API_URL、SERVER_B_API_KEY、ZEROCLOW_DASHBOARD_BASE_URL 等

**步骤 4：添加环境变量**

```
SERVER_B_API_URL=https://zeroclaw.example.com
SERVER_B_API_KEY=<步骤 12 中生成的密钥>
ZEROCLOW_DASHBOARD_BASE_URL=https://zeroclaw.example.com
ZEROCLOW_BASE_PORT=42618
ZEROCLOW_MAX_PORT=65535
```

**步骤 5：部署**

```
wasp build
# 按现有部署流程上传并重启
```

### 10.3 验证部署

**步骤 1：手动开通测试**

在 Server B 上手动测试：

```
# 模拟开通
systemctl start zeroclaw@test001
# 检查状态
systemctl status zeroclaw@test001
# 检查日志
journalctl -u zeroclaw@test001 -f
# 检查健康
curl http://127.0.0.1:42618/test001/health
# 停止测试
systemctl stop zeroclaw@test001
```

**步骤 2：端到端测试**

在 Server A 上：
- 注册测试账号
- 使用 Stripe 测试卡号完成支付
- 检查 ZeroclawInstance 记录是否创建且 status = "active"
- 访问 dashboardUrl 确认 ZeroClaw Dashboard 可用
- 在管理面板设置 API Key 并测试对话

**步骤 3：取消订阅测试**

- 在 Stripe Customer Portal 取消订阅
- 检查 Server B 上对应实例是否已停止
- 重新订阅，检查实例是否恢复

---

## 11. 日常运维手册

### 11.1 常用运维命令

| 操作 | 命令 |
|------|------|
| 查看所有 ZeroClaw 实例 | `systemctl list-units 'zeroclaw@*' --no-pager` |
| 查看运行中的实例 | `systemctl list-units 'zeroclaw@*' --state=active` |
| 查看失败实例 | `systemctl list-units 'zeroclaw@*' --state=failed` |
| 查看单实例日志 | `journalctl -u zeroclaw@u001 -f` |
| 重启单实例 | `systemctl restart zeroclaw@u001` |
| 停止所有实例（维护） | `systemctl stop 'zeroclaw@*'` |
| 恢复所有实例 | `systemctl start 'zeroclaw@*'` |
| 查看资源占用 | `systemd-cgtop -n 1` 找到 agent.slice |
| 查看端口占用 | `ss -tlnp \| grep 4261` |
| 检查实例健康 | `curl -s http://127.0.0.1:42618/u001/health` |
| 查看 ZeroClaw 版本 | `/opt/zeroclaw/bin/zeroclaw --version` |

### 11.2 监控指标

| 指标 | 检查方式 | 告警阈值 |
|------|----------|----------|
| 实例运行数 | `systemctl list-units 'zeroclaw@*' --state=active \| wc -l` | 低于预期付费用户数 |
| 实例失败数 | `systemctl list-units 'zeroclaw@*' --state=failed` | > 0 |
| 内存使用 | agent.slice 在 systemd-cgtop 中的占比 | > 80% 总内存 |
| 磁盘使用 | `df -h /opt/zeroclaw/data` | > 85% |
| 磁盘 I/O | `iostat -x 5` | await > 50ms |
| Provisioning API | `curl -s http://127.0.0.1:3100/api/health` | 返回非 200 |

### 11.3 备份策略

| 备份项 | 频率 | 方式 |
|--------|------|------|
| 用户数据目录 | 每天 | `tar czf /backup/zeroclaw-users-$(date +%Y%m%d).tar.gz /opt/zeroclaw/data/users/` |
| Nginx 路由配置 | 每天 | `cp -r /etc/nginx/zeroclaw-routes/ /backup/nginx-zeroclaw-$(date +%Y%m%d)/` |
| Provisioning API .env | 变更时 | 手动备份到安全位置 |
| Server A PostgreSQL | 每天 | `pg_dump` 或现有备份方案 |

### 11.4 数据清理策略

对于已取消订阅且超过 30 天未恢复的用户：

1. 列出超期数据：查找 `/opt/zeroclaw/data/users/` 下 mtime > 30 天的 config.toml
2. 确认 Server A 上对应用户的 subscriptionStatus 为 "deleted"
3. 确认 ZeroclawInstance.status 为 "suspended"
4. 归档数据目录到冷存储
5. 删除原数据目录释放空间
6. 更新 ZeroclawInstance.status 为 "deleting"
7. 释放 numericId 和端口（供新用户使用）

---

## 12. 故障排查指南

### 12.1 实例启动失败

**症状：** `systemctl status zeroclaw@u001` 显示 failed

**排查步骤：**

1. 查看详细日志：`journalctl -u zeroclaw@u001 -n 50`
2. 检查 config.toml 是否存在且格式正确
3. 检查目录权限：`ls -la /opt/zeroclaw/data/users/u001/`
4. 检查端口是否被占用：`ss -tlnp | grep {port}`
5. 手动运行测试：`sudo -u agent ZEROCLAW_CONFIG_DIR=/opt/zeroclaw/data/users/u001 /opt/zeroclaw/bin/zeroclaw daemon`（查看直接输出）

### 12.2 健康检查超时

**症状：** Provisioning API 报 "Health check timeout"

**排查步骤：**

1. 检查 ZeroClaw 进程是否真的在运行：`systemctl status zeroclaw@u001`
2. 检查端口是否在监听：`ss -tlnp | grep {port}`
3. 检查防火墙/iptables 是否阻止了本地回环连接
4. 检查 config.toml 中 port 和 path_prefix 是否正确
5. 检查 ZeroClaw 版本是否支持 path_prefix（0.6.0+）

### 12.3 用户无法访问 Dashboard

**症状：** 用户点击 Dashboard URL 返回 502 或 404

**排查步骤：**

1. 检查 Nginx 路由文件是否存在：`ls /etc/nginx/zeroclaw-routes/u001.conf`
2. 检查 Nginx 配置是否正确：`nginx -t`
3. 检查 ZeroClaw 实例是否运行：`systemctl is-active zeroclaw@u001`
4. 检查 Nginx 错误日志：`tail -f /var/log/nginx/error.log`
5. 直接测试本地连接：`curl http://127.0.0.1:42618/u001/health`

### 12.4 更新后实例异常

**症状：** 执行 update-all.sh 后部分实例无法启动

**排查步骤：**

1. 检查新版本二进制是否正常：`/opt/zeroclaw/bin/zeroclaw-{新版本} --version`
2. 查看失败实例日志：`journalctl -u zeroclaw@{失败的实例} -n 100`
3. 如果是新版本兼容性问题，立即回滚：
   - 将 symlink 指回旧版本
   - 执行 `systemctl restart 'zeroclaw@*'`
4. 如果只是个别实例问题，检查其 config.toml 是否与新版本不兼容

### 12.5 Provisioning API 无响应

**症状：** Server A 调用 Server B 超时

**排查步骤：**

1. 检查 provisioning 服务状态：`systemctl status provisioning`
2. 检查端口监听：`ss -tlnp | grep 3100`
3. 检查日志：`journalctl -u provisioning -n 50`
4. 检查 .env 文件中的 PROVISIONING_API_KEY 是否与 Server A 一致
5. 检查磁盘空间：`df -h`（磁盘满会导致各种异常）

---

## 附录 A：文件修改总览

### Server A（OpenSaaS）文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/schema.prisma` | 修改 | 添加 ZeroclawInstance 模型和 User 关联 |
| `app/main.wasp` | 修改 | 添加 job, route, page, query, action 声明 |
| `app/src/zeroclaw/portAllocator.ts` | 新建 | 端口分配器 |
| `app/src/zeroclaw/provisioning.ts` | 新建 | Server B API 调用客户端 |
| `app/src/zeroclaw/provisioningJob.ts` | 新建 | PgBoss 异步开通 Job |
| `app/src/zeroclaw/operations.ts` | 新建 | Wasp Query/Action |
| `app/src/zeroclaw/ZeroclawPage.tsx` | 新建 | 前端管理页面 |
| `app/src/payment/stripe/webhook.ts` | 修改 | 添加 ZeroClaw 开通/注销触发 |
| `app/.env.server` | 修改 | 添加 Server B 连接配置 |

### Server B 文件清单

| 文件路径 | 说明 |
|----------|------|
| `/opt/zeroclaw/bin/zeroclaw` | symlink → 当前版本二进制 |
| `/opt/zeroclaw/bin/zeroclaw-{版本}` | 从 GitHub Release 下载的二进制 |
| `/etc/systemd/system/zeroclaw@.service` | systemd 模板 unit |
| `/etc/systemd/system/agent.slice` | cgroup slice 定义 |
| `/etc/systemd/system/provisioning.service` | Provisioning API 服务 |
| `/opt/zeroclaw/provisioning/` | Provisioning API 完整项目 |
| `/opt/zeroclaw/updates/update-all.sh` | 一键更新脚本 |
| `/etc/nginx/sites-available/default` | Nginx 主配置（含 SSL） |
| `/etc/nginx/zeroclaw-routes/*.conf` | 每用户动态路由配置 |

## 附录 B：环境变量汇总

### Server A 需要添加的环境变量

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| SERVER_B_API_URL | `https://zeroclaw.example.com` | Server B 域名 |
| SERVER_B_API_KEY | `openssl rand -hex 32` 生成的密钥 | HMAC 签名密钥 |
| ZEROCLOW_DASHBOARD_BASE_URL | `https://zeroclaw.example.com` | Dashboard 基础 URL |
| ZEROCLOW_BASE_PORT | `42618` | 端口分配起始值 |
| ZEROCLOW_MAX_PORT | `65535` | 端口分配上限 |

### Server B Provisioning API 的环境变量

| 变量名 | 说明 |
|--------|------|
| PROVISIONING_PORT | API 监听端口（默认 3100） |
| PROVISIONING_API_KEY | HMAC 验证密钥（与 Server A 相同） |
| ADMIN_KEY | 管理员操作密钥（用于 /api/update-all） |
| ZEROCLOW_BINARY | ZeroClaw 二进制路径 |
| DATA_DIR | 用户数据根目录 |
| DOMAIN | Server B 域名 |
