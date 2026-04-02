# Server B 任务清单 · ZeroClaw 宿主机部署

> **目标：** 在 Server B 上搭建 ZeroClaw 多实例运行环境 + Provisioning API 管控服务
>
> **约束：** 严禁修改 ZeroClaw 源码；ZeroClaw 二进制直接从 GitHub Release 下载
>
> **参考文档：** `dev_doc/DEPLOYMENT_PLAN.md`

---

## 任务总览

| 阶段 | 任务数 | 依赖 |
|------|--------|------|
| P1 系统初始化 | 3 | 无 |
| P2 ZeroClaw 二进制部署 | 1 | P1 |
| P3 systemd 配置 | 2 | P2 |
| P4 Nginx 反向代理 | 2 | P1 |
| P5 Provisioning API 开发 | 6 | P3 + P4 |
| P6 安全加固 | 2 | P5 |
| P7 更新机制 | 1 | P5 |
| P8 集成验证 | 2 | P7 |

---

## P1 · 系统初始化

### P1.1 安装基础软件

**执行位置：** Server B（干净的 Linux 服务器，推荐 Ubuntu 22.04/24.04）

**操作：** 安装以下软件包

| 软件 | 用途 |
|------|------|
| nginx | 反向代理、SSL 终端 |
| certbot + python3-certbot-nginx | Let's Encrypt SSL 证书 |
| nodejs (v18+) | Provisioning API 运行时 |
| npm | Node.js 包管理 |
| curl | 下载二进制、健康检查 |

**安装指令：**

```
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx nodejs npm curl
```

**验证：** 逐个执行 `nginx -v`、`node -v`、`npm -v`、`certbot --version` 确认安装成功

---

### P1.2 创建运行用户和目录结构

**操作 1：创建系统用户**

```
useradd -r -s /bin/false agent
```

说明：`-r` 创建系统用户，`-s /bin/false` 禁止登录 shell。所有 ZeroClaw 实例都以该用户身份运行。

**操作 2：创建目录结构**

```
mkdir -p /opt/zeroclaw/{bin,data/users,provisioning/src,logs,updates}
mkdir -p /etc/nginx/zeroclaw-routes
```

各目录用途：

| 目录 | 用途 |
|------|------|
| `/opt/zeroclaw/bin/` | ZeroClaw 二进制 + 版本管理 |
| `/opt/zeroclaw/data/users/` | 每用户独立数据目录 |
| `/opt/zeroclaw/provisioning/` | Provisioning API 代码 |
| `/opt/zeroclaw/logs/` | 日志文件 |
| `/opt/zeroclaw/updates/` | 更新脚本 |
| `/etc/nginx/zeroclaw-routes/` | Nginx 动态路由配置片段 |

**操作 3：设置权限**

```
chown -R agent:agent /opt/zeroclaw/data
chmod 700 /opt/zeroclaw/data/users
```

**验证：** `id agent` 显示用户存在；`ls -la /opt/zeroclaw/` 目录结构正确

---

### P1.3 配置防火墙

**操作：**

```
ufw allow 22/tcp    # SSH（如果未开启）
ufw allow 80/tcp    # HTTP（用于 certbot 验证和重定向）
ufw allow 443/tcp   # HTTPS（用户访问 ZeroClaw Dashboard + Provisioning API）
ufw enable
```

**关键：** 端口 3100（Provisioning API）**不需要开放**，因为它只监听 127.0.0.1。

**验证：** `ufw status` 显示仅 22/80/443 开放

---

## P2 · ZeroClaw 二进制部署

### P2.1 下载并安装 ZeroClaw 二进制

**操作步骤：**

1. 确定服务器架构：`uname -m`（x86_64 或 aarch64）

2. 访问 ZeroClaw GitHub Releases 页面，找到最新版本的 tar.gz 下载链接：
   - 文件格式类似：`zeroclaw-x86_64(CPU架构)-unknown(开源项目)-linux(操作系统)-gnu(GNU libc).tar.gz`
   - 如果没有预编译版本，需要在有 Rust 环境的机器上从源码编译：
     ```
     cd /root/下载/zeroclaw-master
     cargo build --release --locked
     ```
     编译产物在 `target/release/zeroclaw`

3. 下载并解压：
   ```
   curl -fSL "<下载URL>" -o /tmp/zeroclaw.tar.gz
   tar -xzf /tmp/zeroclaw.tar.gz -C /tmp/
   ```

4. 安装到版本化路径：
   ```
   cp /tmp/zeroclaw /opt/zeroclaw/bin/zeroclaw-{版本号}
   chmod +x /opt/zeroclaw/bin/zeroclaw-{版本号}
   ```

5. 创建 symlink：
   ```
   ln -sf /opt/zeroclaw/bin/zeroclaw-{版本号} /opt/zeroclaw/bin/zeroclaw
   ```

6. 验证：
   ```
   /opt/zeroclaw/bin/zeroclaw --version
   ```
   应输出版本号。

7. 清理临时文件：
   ```
   rm -f /tmp/zeroclaw.tar.gz /tmp/zeroclaw
   ```

**验证标准：**
- `/opt/zeroclaw/bin/zeroclaw` 是 symlink，指向正确版本
- `--version` 输出与预期一致
- 二进制可执行

---

## P3 · systemd 配置

### P3.1 创建 zeroclaw@.service 模板 unit

**文件：** `/etc/systemd/system/zeroclaw@.service`

**操作：** 新建

**内容要求（ini 格式）：**

**[Unit] 段：**
- Description: `ZeroClaw agent for user %i`
- After: `network.target`

**[Service] 段：**
- Type: `simple`
- ExecStart: `/opt/zeroclaw/bin/zeroclaw daemon`
- Environment: `ZEROCLAW_CONFIG_DIR=/opt/zeroclaw/data/users/%i`
- Environment: `HOME=/opt/zeroclaw/data/users/%i`
- WorkingDirectory: `/opt/zeroclaw/data/users/%i`
- User: `agent`
- Group: `agent`
- Restart: `on-failure`
- RestartSec: `5`
- MemoryMax: `256M`
- MemorySwapMax: `0`
- CPUQuota: `50%`
- TasksMax: `64`
- Slice: `agent.slice`
- StandardOutput: `journal`
- StandardError: `journal`
- SyslogIdentifier: `zeroclaw-%i`

**[Install] 段：**
- WantedBy: `multi-user.target`

**关键说明：**
- `%i` 是 systemd 模板替换符，启动 `zeroclaw@u001` 时自动替换为 `u001`
- `ZEROCLAW_CONFIG_DIR` 是 ZeroClaw 原生支持的环境变量，让它去指定目录找 config.toml
- `MemoryMax=256M` 通过 cgroup v2 限制每个实例内存上限
- `Slice=agent.slice` 将所有实例归入统一管理组

---

### P3.2 创建 agent.slice

**文件：** `/etc/systemd/system/agent.slice`

**操作：** 新建

**内容要求：**

**[Unit] 段：**
- Description: `ZeroClaw Agent Slice`
- Before: `slices.target`

**[Slice] 段：**
- CPUAccounting: `yes`
- MemoryAccounting: `yes`

**完成后执行：**

```
systemctl daemon-reload
```

**验证：**
- `systemctl list-unit-files | grep zeroclaw` 显示 `zeroclaw@.service`
- `systemctl list-unit-files | grep agent.slice` 显示 `agent.slice`

---

## P4 · Nginx 反向代理

### P4.1 配置 SSL 证书

**操作：**

```
certbot --nginx -d <Server B 域名> --non-interactive --agree-tos -m <管理员邮箱>
```

**前提：** 域名已解析到 Server B IP，且 80 端口可从公网访问。

**验证：** `curl -I https://<域名>` 返回 200 或 404（证书有效即可）

---

### P4.2 配置 Nginx 主配置

**文件：** `/etc/nginx/sites-available/default`

**操作：** 覆盖

**内容要求：**

**443 端口 SSL server block：**
- `server_name` 设为 Server B 域名
- SSL 证书路径使用 certbot 生成的路径
- 以下 location 块：
  - `location /api/`：proxy_pass 到 `http://127.0.0.1:3100`（Provisioning API），设置 `proxy_set_header X-Real-IP $remote_addr`
  - `include /etc/nginx/zeroclaw-routes/*.conf`（动态路由目录）
  - `location /`：返回 404（无匹配路由时的默认处理）

**80 端口 HTTP server block：**
- `return 301 https://$host$request_uri`（重定向到 HTTPS）

**完成后执行：**

```
nginx -t && systemctl reload nginx
```

**验证：**
- `curl -I https://<域名>/api/health` 返回 200（Provisioning API 启动后）
- `curl -I https://<域名>/` 返回 404

---

## P5 · Provisioning API 开发

### P5.1 初始化 npm 项目

**执行位置：** `/opt/zeroclaw/provisioning/`

**操作：**

1. 创建 `package.json`：
   - name: `zeroclaw-provisioning`
   - version: `1.0.0`
   - type: `module`（使用 ES Module）
   - dependencies: `express` (^5.x)
   - scripts.start: `node src/index.js`

2. 执行 `npm install`

**验证：** `node_modules/` 目录和 `package-lock.json` 已生成

---

### P5.2 编写 `src/auth.ts` — HMAC 认证中间件

**文件：** `/opt/zeroclaw/provisioning/src/auth.ts`

**操作：** 新建

**功能要求：**

导出一个 Express 中间件函数 `authenticate(req, res, next)`：

1. 从 `req.headers` 提取 `x-timestamp` 和 `x-signature`
2. 如果缺失任一，返回 401 + `{ error: "Missing authentication headers" }`
3. 解析 timestamp 为整数，检查与 `Date.now()` 偏差不超过 5 分钟（防重放）
4. 用 `process.env.PROVISIONING_API_KEY` 作为 secret，对 timestamp 做 HMAC-SHA256
5. 使用 `crypto.timingSafeEqual` 比较签名（防时序攻击）
6. 不匹配返回 401 + `{ error: "Invalid signature" }`
7. 匹配则调用 `next()`

**注意：** `/api/health` 路由不需要认证（在路由注册时跳过此中间件）。

---

### P5.3 编写 `src/config.ts` — config.toml 模板渲染

**文件：** `/opt/zeroclaw/provisioning/src/config.ts`

**操作：** 新建

**功能要求：**

导出一个函数 `renderConfig(opts)` — `opts` 包含 `port`、`pathPrefix`、`dataDir`

渲染结果为 TOML 格式字符串，包含以下段：

| 段 | 键 | 值 |
|----|-----|-----|
| 顶层 | default_provider | `"openrouter"` |
| 顶层 | api_key | `""`（初始为空） |
| [gateway] | port | opts.port |
| [gateway] | host | `"127.0.0.1"` |
| [gateway] | path_prefix | opts.pathPrefix |
| [gateway] | require_pairing | `false` |
| [gateway] | allow_public_bind | `true` |
| [autonomy] | workspace_only | `true` |
| [autonomy] | allowed_commands | `["git", "curl", "grep"]` |
| [cost] | enabled | `true` |
| [cost] | daily_limit_usd | `5.00` |
| [cost] | monthly_limit_usd | `50.00` |
| [cost] | warn_at_percent | `80` |
| [memory] | backend | `"sqlite"` |
| [memory] | auto_save | `true` |
| [browser] | enabled | `false` |

导出另一个函数 `updateConfigContent(configContent, opts)` — `opts` 包含 `provider` 和 `apiKey`：
- 用正则替换 configContent 中的 `api_key` 和 `default_provider`
- 返回修改后的字符串

---

### P5.4 编写 `src/systemd.ts` — systemd 服务管理

**文件：** `/opt/zeroclaw/provisioning/src/systemd.ts`

**操作：** 新建

**功能要求：**

使用 Node.js `child_process.exec`（promisified）执行 systemctl 命令。

从环境变量读取 `DATA_DIR`（默认 `/opt/zeroclaw/data/users`）和 `ZEROCLOW_BINARY`（默认 `/opt/zeroclaw/bin/zeroclaw`）。

**导出以下函数：**

**`provisionInstance(opts)`** — opts: `{ instanceId, port, pathPrefix }`
1. 创建目录 `{DATA_DIR}/{instanceId}/workspace`（recursive）
2. 调用 `renderConfig` 生成 TOML，写入 `{DATA_DIR}/{instanceId}/config.toml`
3. 设置文件权限 600（`chmod 600`）
4. 设置文件 owner 为 agent:agent（`chown agent:agent`）
5. 执行 `systemctl enable zeroclaw@{instanceId}`
6. 执行 `systemctl start zeroclaw@{instanceId}`
7. 调用 `waitForHealth` 等待健康检查通过
8. 如果任何步骤失败，抛出包含明确错误信息的 Error

**`deprovisionInstance(instanceId)`**
1. 执行 `systemctl stop zeroclaw@{instanceId} || true`（忽略未运行的错误）
2. 执行 `systemctl disable zeroclaw@{instanceId} || true`
3. **不删除数据目录**（保留用于续费恢复）

**`getInstanceStatus(instanceId)`**
1. 执行 `systemctl show zeroclaw@{instanceId} --property=ActiveState,MainPID,MemoryCurrent`
2. 解析输出为 key=value 格式
3. 读取 `{DATA_DIR}/{instanceId}/config.toml` 获取 port
4. 返回 `{ instanceId, activeState, pid, memory, port }`
5. 失败时返回 null

**`updateConfig(instanceId, opts)`** — opts: `{ provider, apiKey }`
1. 读取 `{DATA_DIR}/{instanceId}/config.toml`
2. 调用 `updateConfigContent` 替换 api_key 和 provider
3. 写回文件
4. 执行 `systemctl restart zeroclaw@{instanceId}`

**内部辅助函数 `waitForHealth(instanceId, port, pathPrefix, timeoutSecs)`：**
- 轮询 `http://127.0.0.1:{port}{pathPrefix}/health`，间隔 1 秒
- 默认超时 30 秒
- 成功返回（HTTP 200）
- 超时抛出 Error

---

### P5.5 编写 `src/nginx.ts` — Nginx 路由管理

**文件：** `/opt/zeroclaw/provisioning/src/nginx.ts`

**操作：** 新建

**功能要求：**

**`addNginxRoute(opts)`** — opts: `{ instanceId, port, pathPrefix }`
1. 确保 `/etc/nginx/zeroclaw-routes/` 目录存在
2. 写入 `/etc/nginx/zeroclaw-routes/{instanceId}.conf`，内容为 location 块：
   - 路径：`{pathPrefix}/`
   - proxy_pass：`http://127.0.0.1:{port}{pathPrefix}/`
   - 包含 WebSocket 升级头：`proxy_set_header Upgrade $http_upgrade`、`proxy_set_header Connection "upgrade"`
   - 包含 Host 和 X-Real-IP 头
   - `proxy_read_timeout 86400`（WebSocket 长连接）
3. 执行 `nginx -t && nginx -s reload`

**`removeNginxRoute(instanceId)`**
1. 删除 `/etc/nginx/zeroclaw-routes/{instanceId}.conf`
2. 执行 `nginx -t && nginx -s reload`
3. 用 try-catch 包裹（文件不存在时不报错）

---

### P5.6 编写 `src/health.ts` + `src/index.ts` — 健康检查 + 入口

**文件 1：** `/opt/zeroclaw/provisioning/src/health.ts`

**功能：**

导出异步函数 `healthCheck()`：
1. 执行 `systemctl list-units 'zeroclaw@*' --state=active --no-legend | wc -l` 获取运行实例数
2. 执行 `systemctl list-units 'zeroclaw@*' --no-legend | wc -l` 获取总实例数
3. 读取 ZeroClaw 版本：`/opt/zeroclaw/bin/zeroclaw --version`
4. 读取磁盘用量：`df -h /opt/zeroclaw/data` 解析使用百分比
5. 返回 `{ status: "ok", activeInstances, totalInstances, zeroclawVersion, diskUsage, timestamp }`

**文件 2：** `/opt/zeroclaw/provisioning/src/index.ts`

**功能：Express 入口**

1. 创建 Express app，使用 `express.json()` 中间件
2. 注册路由（按以下顺序）：

| 方法 | 路径 | 中间件 | 说明 |
|------|------|--------|------|
| GET | /api/health | 无 | 调用 healthCheck() 返回结果 |
| -- | -- | authenticate | 之后所有路由都需要认证 |
| POST | /api/provision | authenticate | 调用 provisionInstance + addNginxRoute |
| POST | /api/deprovision | authenticate | 调用 deprovisionInstance + removeNginxRoute |
| GET | /api/instances/:id | authenticate | 调用 getInstanceStatus |
| POST | /api/instances/:id/config | authenticate | 调用 updateConfig |
| POST | /api/update-all | 独立验证 admin key | 异步执行 update-all.sh |

3. 监听 `process.env.PROVISIONING_PORT || 3100`，绑定到 `127.0.0.1`（仅本机）
4. 启动时 log: `"Provisioning API listening on port {PORT}"`

**所有路由的统一错误处理：** try-catch 包裹，catch 中返回 500 + `{ error: error.message }`

**`/api/provision` 路由详细流程：**
1. 从 req.body 解构 `{ userId, instanceId, port, pathPrefix }`
2. 调用 `provisionInstance({ instanceId, port, pathPrefix })`
3. 调用 `addNginxRoute({ instanceId, port, pathPrefix })`
4. 返回 `{ success: true, dashboardUrl: "https://{DOMAIN}{pathPrefix}/" }`

**`/api/deprovision` 路由详细流程：**
1. 从 req.body 解构 `{ instanceId }`
2. 调用 `deprovisionInstance(instanceId)`
3. 调用 `removeNginxRoute(instanceId)`
4. 返回 `{ success: true }`

---

### P5.7 创建 Provisioning API 的 systemd service

**文件：** `/etc/systemd/system/provisioning.service`

**操作：** 新建

**内容要求：**

**[Unit] 段：**
- Description: `ZeroClaw Provisioning API`
- After: `network.target`

**[Service] 段：**
- Type: `simple`
- WorkingDirectory: `/opt/zeroclaw/provisioning`
- ExecStart: `/usr/bin/node src/index.js`
- EnvironmentFile: `/opt/zeroclaw/provisioning/.env`
- User: `root`（需要 root 权限执行 systemctl 命令）
- Restart: `on-failure`
- RestartSec: `5`

**[Install] 段：**
- WantedBy: `multi-user.target`

**同时创建 `.env` 文件** `/opt/zeroclaw/provisioning/.env`：

```
PROVISIONING_PORT=3100
PROVISIONING_API_KEY=<用 openssl rand -hex 32 生成>
ADMIN_KEY=<用 openssl rand -hex 32 生成>
ZEROCLOW_BINARY=/opt/zeroclaw/bin/zeroclaw
DATA_DIR=/opt/zeroclaw/data/users
DOMAIN=<Server B 域名>
```

**设置 .env 权限：** `chmod 600 /opt/zeroclaw/provisioning/.env`

**启动：**

```
systemctl daemon-reload
systemctl enable --now provisioning
```

**验证：**
- `systemctl status provisioning` 显示 active (running)
- `curl http://127.0.0.1:3100/api/health` 返回 JSON

**重要：** 记录生成的 `PROVISIONING_API_KEY`，需要配置到 Server A 的 `.env.server` 中。

---

## P6 · 安全加固

### P6.1 安全检查清单

逐项确认：

| 检查项 | 验证方式 |
|--------|----------|
| PROVISIONING_API_KEY 为 64 字符 hex | `echo $KEY \| wc -c` 应为 65（含换行） |
| config.toml 权限 600 | 创建测试实例后 `ls -la /opt/zeroclaw/data/users/u001/` |
| SSL 证书有效 | `curl -vI https://<域名> 2>&1 \| grep "SSL connection"` |
| 防火墙仅 80/443 | `ufw status` |
| API 端口不对外 | `ss -tlnp \| grep 3100` 应显示 127.0.0.1 |
| agent 用户禁止登录 | `grep agent /etc/passwd` 应显示 `/bin/false` |
| .env 文件权限 | `ls -la /opt/zeroclaw/provisioning/.env` 应为 `-rw-------` |

---

### P6.2 Provisioning API 认证测试

**操作：** 使用 curl 测试 HMAC 签名认证

1. 无认证头请求应返回 401
2. 错误签名应返回 401
3. 过期 timestamp（超过 5 分钟）应返回 401
4. 正确签名应返回 200（对于 /api/health 以外的路由）

---

## P7 · 更新机制

### P7.1 编写 `update-all.sh` 一键更新脚本

**文件：** `/opt/zeroclaw/updates/update-all.sh`

**操作：** 新建

**脚本流程：**

1. **变量定义：**
   - BIN_DIR: `/opt/zeroclaw/bin`
   - DATA_DIR: `/opt/zeroclaw/data/users`
   - LOG_FILE: `/opt/zeroclaw/logs/update.log`

2. **日志函数：** 带 timestamp 的 log 输出，同时 tee 到 LOG_FILE

3. **获取最新版本：**
   - curl GitHub API `https://api.github.com/repos/zeroclaw-labs/zeroclaw/releases/latest`
   - 提取 `tag_name`，去掉 `v` 前缀得到版本号
   - 读取当前 symlink 指向的文件名提取当前版本
   - 版本相同则 log 并退出

4. **下载新版本：**
   - 检测架构（uname -m）
   - 下载对应 tar.gz
   - 解压到临时目录
   - 移动到 `${BIN_DIR}/zeroclaw-{新版本}`
   - chmod +x
   - 清理临时文件

5. **验证二进制：**
   - 执行 `{新版本路径} --version`
   - 失败则 log 错误并退出

6. **替换 symlink：**
   - `ln -sf {新版本路径} ${BIN_DIR}/zeroclaw`

7. **滚动重启：**
   - 列出所有 `systemctl list-units 'zeroclaw@*'` 的运行中服务
   - 逐个 `systemctl restart {service}`
   - 每次重启后 sleep 2，检查 `systemctl is-active`
   - 统计成功/失败数

8. **清理旧版本：**
   - 列出 `${BIN_DIR}/zeroclaw-*` 所有文件
   - 按修改时间排序
   - 保留最近 3 个，删除其余

9. **结果输出：** log 总计重启数、失败数

**设置权限：** `chmod +x /opt/zeroclaw/updates/update-all.sh`

**（可选）设置 cron：**

```
crontab -e
# 添加：
0 3 * * * /opt/zeroclaw/updates/update-all.sh >> /opt/zeroclaw/logs/update.log 2>&1
```

---

## P8 · 集成验证

### P8.1 手动开通/注销测试

**在 Server B 上手动测试整个流程：**

**测试 1：手动创建并启动一个 ZeroClaw 实例**

1. 创建测试目录和配置：
   ```
   mkdir -p /opt/zeroclaw/data/users/test001/workspace
   ```
2. 手动写入一个最小的 config.toml（参考 P5.3 的模板），port=42999，path_prefix="/test001"
3. 启动：`systemctl start zeroclaw@test001`
4. 检查状态：`systemctl status zeroclaw@test001`
5. 检查日志：`journalctl -u zeroclaw@test001 -n 20`
6. 检查端口：`ss -tlnp | grep 42999`
7. 健康检查：`curl http://127.0.0.1:42999/test001/health`
8. 停止：`systemctl stop zeroclaw@test001`
9. 清理测试数据

**测试 2：通过 Provisioning API 开通**

1. 生成 HMAC 签名（可用 Node.js 一行命令）
2. 发送 provision 请求：
   - POST `http://127.0.0.1:3100/api/provision`
   - Body: `{ "userId": "test-user-id", "instanceId": "utest", "numericId": 999, "port": 42999, "pathPrefix": "/utest" }`
   - Headers: X-Timestamp + X-Signature
3. 检查返回结果包含 `success: true` 和 `dashboardUrl`
4. 验证 systemd 服务已启动：`systemctl status zeroclaw@utest`
5. 验证 Nginx 路由已生成：`ls /etc/nginx/zeroclaw-routes/utest.conf`
6. 验证健康检查：`curl http://127.0.0.1:42999/utest/health`

**测试 3：通过 API 注销**

1. 发送 deprovision 请求：POST `/api/deprovision`，Body: `{ "instanceId": "utest" }`
2. 验证服务已停止：`systemctl is-active zeroclaw@utest` 应返回 inactive
3. 验证 Nginx 路由已删除
4. 验证数据目录仍存在（未被删除）

**测试 4：资源限制验证**

1. 启动一个测试实例
2. 检查 cgroup 设置：`systemctl show zeroclaw@test001 --property=MemoryMax,CPUQuota`
3. 验证 MemoryMax=268435456（256MB），CPUQuota=50%

---

### P8.2 与 Server A 联调

**前提：** Server A 的任务（`task_list_opensaas.md`）已完成 T1-T5

1. 将 P5.7 中生成的 `PROVISIONING_API_KEY` 配置到 Server A 的 `.env.server`
2. 在 Server A 上触发一次测试开通（通过 Stripe 测试支付或手动提交 PgBoss Job）
3. 检查 Server B 上是否自动创建了对应的 systemd 服务和 Nginx 路由
4. 在浏览器访问 dashboardUrl，确认 ZeroClaw Web 界面正常加载
5. 测试 API Key 更新：在 Server A 的管理面板设置 API Key，检查 Server B 上 config.toml 已更新且服务已重启

---

## 文件清单速查

| 文件路径 | 操作 | 任务 |
|----------|------|------|
| `/opt/zeroclaw/bin/zeroclaw-{版本}` | 下载 | P2.1 |
| `/opt/zeroclaw/bin/zeroclaw` (symlink) | 创建 | P2.1 |
| `/etc/systemd/system/zeroclaw@.service` | 新建 | P3.1 |
| `/etc/systemd/system/agent.slice` | 新建 | P3.2 |
| `/etc/nginx/sites-available/default` | 覆盖 | P4.2 |
| `/opt/zeroclaw/provisioning/package.json` | 新建 | P5.1 |
| `/opt/zeroclaw/provisioning/src/auth.ts` | 新建 | P5.2 |
| `/opt/zeroclaw/provisioning/src/config.ts` | 新建 | P5.3 |
| `/opt/zeroclaw/provisioning/src/systemd.ts` | 新建 | P5.4 |
| `/opt/zeroclaw/provisioning/src/nginx.ts` | 新建 | P5.5 |
| `/opt/zeroclaw/provisioning/src/health.ts` | 新建 | P5.6 |
| `/opt/zeroclaw/provisioning/src/index.ts` | 新建 | P5.6 |
| `/opt/zeroclaw/provisioning/.env` | 新建 | P5.7 |
| `/etc/systemd/system/provisioning.service` | 新建 | P5.7 |
| `/opt/zeroclaw/updates/update-all.sh` | 新建 | P7.1 |

## 执行顺序

```
P1.1 (安装软件) ───→ P1.2 (用户/目录) ───→ P1.3 (防火墙)
                                              ↓
P2.1 (下载二进制) ←──────────────────────────┘
  ↓
P3.1 + P3.2 (systemd) ──→ systemctl daemon-reload
  ↓
P4.1 (SSL) → P4.2 (Nginx) ──→ nginx -t && reload
  ↓
P5.1 (npm init) → P5.2 (auth) → P5.3 (config) → P5.4 (systemd) → P5.5 (nginx)
                                                                   ↓
                                                               P5.6 (index)
                                                                   ↓
                                                               P5.7 (deploy)
                                                                   ↓
P6.1 + P6.2 (安全验证) ←─────────────────────────────────────────┘
  ↓
P7.1 (更新脚本)
  ↓
P8.1 (手动验证) → P8.2 (联调)
```
