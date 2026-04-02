# GitHub 托管操作指引

> 项目：Amigo AI SaaS（基于 Wasp + Open SaaS 模板）
> 日期：2026-04-02

---

## 0. 架构说明：为什么用单仓库

本项目基于 **Wasp 框架**，前端（React）和后端（Node.js + Prisma）通过 `main.wasp` 统一定义，无法拆分。

```
repo/
├── app/                    ← Wasp 全栈应用（前端 + 后端，不可拆）
│   ├── main.wasp           ← 核心配置（路由、actions、queries 全在这）
│   ├── schema.prisma       ← 数据库模型
│   ├── src/
│   │   ├── client/         ← 前端 React 组件
│   │   ├── server/         ← 后端逻辑
│   │   └── shared/         ← 前后端共享类型
│   └── package.json
├── blog/                   ← Astro 博客（可独立部署，但代码放同一仓库）
├── e2e-tests/              ← Playwright 端到端测试
├── dev_doc/                ← 开发文档
└── .gitignore
```

**结论：创建 1 个 GitHub 仓库，不要拆分。**

---

## 1. 前置检查

### 1.1 修改 .gitignore：允许提交 .env 文件

**目标**：服务器拉取仓库后可以直接部署，无需手动配置环境变量。

将根目录 `.gitignore` 修改为：

```gitignore
# macOS
.DS_Store

# 忽略备份文件
.env.backup
*.bak

# 不忽略 .env.server 和 .env.client（需要提交到仓库，实现拉取即部署）
```

---

## 2. 确认文件提交清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `app/.env.server` | ✅ 提交 | 包含所有服务端配置，拉取即用 |
| `app/.env.client` | ✅ 提交 | 客户端环境变量 |
| `app/.env.server.example` | ✅ 提交 | 模板文件，保留作参考 |
| `app/.env.client.example` | ✅ 提交 | 模板文件，保留作参考 |
| `app/node_modules/` | ❌ 忽略 | 依赖目录（已在 app/.gitignore） |
| `app/.wasp/` | ❌ 忽略 | Wasp 构建产物（已在 app/.gitignore） |
| `blog/node_modules/` | ❌ 忽略 | 依赖目录（已在 blog/.gitignore） |

检查 `app/.gitignore` 和 `blog/.gitignore` 确保 `node_modules/` 和 `.wasp/` 已被忽略。

执行检查命令：

```bash
cd /root/opencode/my-saas-app_20260327

# 查看哪些文件会被 git 追踪
git init
git status

# 确认 .env.server 和 .env.client 会出现在待提交列表中
```

---

## 3. GitHub 操作步骤

### 3.1 在 GitHub 创建仓库

1. 登录 GitHub → 点击右上角 `+` → `New repository`
2. 填写信息：
   - **Repository name**: `amigo-ai`（或你喜欢的名字）
   - **Description**: `Amigo – Your Personal AI Agent | Built with Wasp + Open SaaS`
   - **Visibility**: `Private`（推荐初期私有，后续可改 Public）
   - **不要勾选** Initialize with README / .gitignore（本地已有）
3. 点击 `Create repository`

### 3.2 初始化本地 Git 并推送

```bash
cd /root/opencode/my-saas-app_20260327

# 1. 初始化 git（如果还没有）
git init

# 2. 修改 .gitignore（见第 1 节）

# 3. 添加所有文件（包括 .env.server 和 .env.client）
git add .

# 4. 验证即将提交的内容
git status
# 确认：.env.server、.env.client 都在待提交列表中

# 5. 首次提交
git commit -m "Initial commit: Amigo AI SaaS application

- Wasp full-stack app (frontend + backend)
- Astro blog/docs site
- Playwright e2e tests
- Based on Open SaaS template"

# 6. 设置主分支为 main
git branch -M main

# 7. 添加远程仓库（HTTPS 方式）
git remote add origin https://github.com/YOUR_USERNAME/amigo-ai.git

# 或者使用 SSH 方式（需要先配置 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/amigo-ai.git

# 8. 推送
git push -u origin main
```

### 3.3 验证推送结果

```bash
# 确认远程仓库已更新
git remote -v
git log --oneline -5
```

在 GitHub 网页上打开仓库，确认：
- ✅ `app/.env.server` 存在
- ✅ `app/.env.client` 存在
- ✅ `app/.env.server.example` 存在
- ✅ `app/src/` 目录存在
- ✅ `blog/` 目录存在
- ❌ `node_modules/` 不存在
- ❌ `.wasp/` 不存在

---

## 4. SSH Key 配置（推荐）

如果使用 SSH 方式推送，需要先配置：

```bash
# 1. 生成 SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. 启动 ssh-agent
eval "$(ssh-agent -s)"

# 3. 添加 key
ssh-add ~/.ssh/id_ed25519

# 4. 复制公钥
cat ~/.ssh/id_ed25519.pub
# 复制输出内容

# 5. 添加到 GitHub
# GitHub → Settings → SSH and GPG keys → New SSH key → 粘贴公钥

# 6. 测试连接
ssh -T git@github.com
```

---

## 5. 后续配置建议

### 5.1 分支保护

在 GitHub 仓库设置中：
- `Settings` → `Branches` → `Add rule`
- Branch name pattern: `main`
- 勾选 `Require a pull request before merging`

### 5.2 GitHub Actions（CI/CD）

后续可配置自动化：
- `.github/workflows/ci.yml` — 代码检查 + 测试
- `.github/workflows/deploy.yml` — 自动部署

### 5.3 环境变量管理

- `.env.server` 和 `.env.client` 已提交到仓库，服务器拉取后直接可用
- 如需区分不同环境（开发/测试/生产），可在部署时通过环境变量覆盖：
  ```bash
  # 部署时覆盖某个变量
  export DATABASE_URL=postgresql://prod-db-url
  wasp start
  ```
- 确保仓库设为 Private，防止密钥泄露

### 5.4 Collaborators

如果是团队项目：
- `Settings` → `Collaborators` → `Add people`
- 发送邀请给团队成员

---

## 6. 快速命令参考

```bash
# 日常开发流程
git add .
git commit -m "feat: 描述你的改动"
git push

# 创建新功能分支
git checkout -b feature/your-feature-name
git push -u origin feature/your-feature-name

# 同步远程更新
git pull origin main

# 查看状态
git status
git log --oneline --graph
```

---

## 7. 常见问题

### Q: 服务器如何部署？

```bash
# 1. 克隆仓库
git clone git@github.com:YOUR_USERNAME/amigo-ai.git
cd amigo-ai

# 2. 安装依赖
cd app && npm install
cd ../blog && npm install

# 3. 直接启动（.env 文件已包含在仓库中）
wasp db migrate-dev
wasp start
```

### Q: 如何更新服务器代码？

```bash
cd /path/to/amigo-ai
git pull origin main
cd app && npm install  # 如果有新依赖
wasp db migrate-dev    # 如果有数据库变更
# 重启服务
```

### Q: blog 需要独立部署到 Vercel？

代码仍在同一仓库，部署时配置 Vercel 的 **Root Directory** 为 `blog/` 即可。

### Q: 如何在多台电脑同步开发？

```bash
# 新电脑克隆仓库
git clone git@github.com:YOUR_USERNAME/amigo-ai.git

# .env 文件已包含，直接安装依赖即可
cd app && npm install
cd ../blog && npm install

# 启动
wasp start
```

---

## Checklist

完成以下步骤后打勾：

- [ ] 修改 .gitignore（移除 .env 相关忽略规则）
- [ ] 在 GitHub 创建 Private 仓库
- [ ] 本地 git init + commit（确认 .env 文件在提交列表中）
- [ ] 添加 remote origin
- [ ] 推送成功
- [ ] 验证 GitHub 上 .env.server 和 .env.client 存在
- [ ] 测试服务器拉取部署
- [ ] （可选）配置 SSH key
- [ ] （可选）设置分支保护规则
