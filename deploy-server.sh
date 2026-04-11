#!/bin/bash
set -e

LOG_FILE="/opt/opensaas/deploy.log"
REPO_DIR="/opt/opensaas/repo"
COMPOSE_DIR="/opt/opensaas"
BUILD_DIR="/opt/opensaas/repo/app/.wasp/out"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== 开始部署 =========="

# 1. 拉取最新代码
log "Step 1: 拉取最新代码..."
if [ ! -d "$REPO_DIR" ]; then
    git clone https://github.com/ksahdsambn/amigo-ai-saas.git "$REPO_DIR" 2>&1 | tee -a "$LOG_FILE"
else
    cd "$REPO_DIR" && git fetch --all && git reset --hard origin/main 2>&1 | tee -a "$LOG_FILE"
fi

# 2. 检查构建产物是否存在
if [ ! -d "$BUILD_DIR/server" ] || [ ! -d "$BUILD_DIR/web-app/build" ]; then
    log "ERROR: 构建产物不存在，请先在本地运行 wasp build + vite build 并推送"
    exit 1
fi

# 3. 同步后端构建产物到 server-build
log "Step 2: 同步后端构建产物..."
rsync -av --delete \
    --exclude='node_modules' \
    "$BUILD_DIR/" \
    "/opt/opensaas/server-build/" \
    2>&1 | tee -a "$LOG_FILE"

# 4. 同步前端构建产物到 client-build
log "Step 3: 同步前端构建产物..."
rsync -av --delete \
    "$BUILD_DIR/web-app/build/" \
    "/opt/opensaas/client-build/" \
    2>&1 | tee -a "$LOG_FILE"

# 5. 重建并重启容器
log "Step 4: 重建并重启容器..."
cd "$COMPOSE_DIR"

# 确保 docker-compose.yml 中使用 NVIDIA_API_KEY
if grep -q "OPENAI_API_KEY" docker-compose.yml 2>/dev/null; then
    log "检测到 OPENAI_API_KEY，替换为 NVIDIA_API_KEY..."
    sed -i 's|OPENAI_API_KEY:.*|NVIDIA_API_KEY: "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"|' docker-compose.yml
fi

docker compose build --no-cache server 2>&1 | tee -a "$LOG_FILE"
docker compose up -d server client 2>&1 | tee -a "$LOG_FILE"

# 6. 健康检查
log "Step 5: 等待服务启动..."
sleep 10

if docker compose ps | grep -q "Up"; then
    log "SUCCESS: 容器运行正常"
    docker compose ps 2>&1 | tee -a "$LOG_FILE"
else
    log "WARNING: 容器可能未正常启动，请检查日志"
    docker compose logs --tail=50 server 2>&1 | tee -a "$LOG_FILE"
fi

log "========== 部署完成 =========="
