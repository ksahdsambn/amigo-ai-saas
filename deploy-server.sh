#!/bin/bash
set -e

LOG_FILE="/opt/opensaas/deploy.log"
REPO_DIR="/opt/opensaas/repo"
COMPOSE_DIR="/opt/1panel/docker/compose/opensaas"
BUILD_DIR="/opt/opensaas/repo/app/.wasp/out"

echo "" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========== 开始部署 ==========" >> "$LOG_FILE"

# 1. 拉取最新代码
echo "[1/5] 拉取最新代码..."
cd "$REPO_DIR"
git fetch --all >> "$LOG_FILE" 2>&1
BEFORE=$(git rev-parse HEAD)
git reset --hard origin/main >> "$LOG_FILE" 2>&1
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
    echo "[1/5] 代码无变化，跳过部署"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 代码无变化，跳过部署" >> "$LOG_FILE"
    exit 0
fi

echo "[1/5] 代码已更新: $BEFORE -> $AFTER"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 代码更新: $BEFORE -> $AFTER" >> "$LOG_FILE"

# 2. 检查构建产物
echo "[2/5] 检查构建产物..."
if [ ! -d "$BUILD_DIR/server" ] || [ ! -d "$BUILD_DIR/web-app/build" ]; then
    echo "[2/5] ERROR: 构建产物不存在，请先在本地运行 wasp build + vite build 并 git push"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 构建产物不存在" >> "$LOG_FILE"
    exit 1
fi
echo "[2/5] 构建产物存在"

# 3. 同步后端构建产物
echo "[3/5] 同步后端构建产物 -> /opt/opensaas/server-build/"
rsync -a --delete \
    --exclude='node_modules' \
    "$BUILD_DIR/" \
    "/opt/opensaas/server-build/" \
    >> "$LOG_FILE" 2>&1
echo "[3/5] 后端同步完成"

# 4. 同步前端构建产物
echo "[4/5] 同步前端构建产物 -> /opt/opensaas/client-build/"
rsync -a --delete \
    "$BUILD_DIR/web-app/build/" \
    "/opt/opensaas/client-build/" \
    >> "$LOG_FILE" 2>&1
echo "[4/5] 前端同步完成"

# 5. 重建并重启容器
echo "[5/5] 重建并重启容器..."
cd "$COMPOSE_DIR"

docker compose build --no-cache server >> "$LOG_FILE" 2>&1
docker compose up -d server client >> "$LOG_FILE" 2>&1

sleep 10

if docker compose ps 2>/dev/null | grep -q "Up"; then
    echo "[5/5] 部署成功，容器运行正常"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 部署成功" >> "$LOG_FILE"
else
    echo "[5/5] WARNING: 容器可能异常，请检查: docker compose logs server"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')]" >> "$LOG_FILE"
    docker compose logs --tail=30 server >> "$LOG_FILE" 2>&1
fi

echo "========== 部署完成 =========="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========== 部署完成 ==========" >> "$LOG_FILE"
