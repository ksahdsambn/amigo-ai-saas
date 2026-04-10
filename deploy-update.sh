#!/bin/bash
set -e

REPO_DIR="/opt/opensaas/repo"
COMPOSE_FILE="/opt/opensaas/docker-compose.yml"

echo "=== Step 1: 拉取最新代码 ==="
if [ ! -d "$REPO_DIR" ]; then
    git clone https://github.com/ksahdsambn/amigo-ai-saas.git "$REPO_DIR"
else
    cd "$REPO_DIR" && git pull origin main
fi

cd "$REPO_DIR/app"

echo "=== Step 2: 安装 wasp（如未安装）==="
if ! command -v wasp &> /dev/null; then
    curl -sSL https://get.wasp-lang.dev/installer.sh | sh
fi

echo "=== Step 3: 构建后端 ==="
wasp build

echo "=== Step 4: 构建前端 ==="
REACT_APP_API_URL=https://api.agentkm.com npx vite build

echo "=== Step 5: 更新 docker-compose.yml 环境变量 ==="
# 替换 OPENAI_API_KEY 为 NVIDIA_API_KEY
sed -i 's|OPENAI_API_KEY:.*|NVIDIA_API_KEY: "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"|' "$COMPOSE_FILE"
echo "已替换 OPENAI_API_KEY -> NVIDIA_API_KEY"

echo "=== Step 6: 备份旧构建 ==="
BACKUP_DIR="/opt/opensaas/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /opt/opensaas/server-build "$BACKUP_DIR/" 2>/dev/null || true
cp -r /opt/opensaas/client-build "$BACKUP_DIR/" 2>/dev/null || true
echo "备份已保存到 $BACKUP_DIR"

echo "=== Step 7: 清理并复制新后端构建 ==="
rm -rf /opt/opensaas/server-build/*
BUILD_SRC="$REPO_DIR/app/.wasp/out"
cp -r "$BUILD_SRC/server" /opt/opensaas/server-build/
cp -r "$BUILD_SRC/sdk" /opt/opensaas/server-build/
cp -r "$BUILD_SRC/libs" /opt/opensaas/server-build/
cp -r "$BUILD_SRC/db" /opt/opensaas/server-build/
cp -r "$BUILD_SRC/src" /opt/opensaas/server-build/
cp "$BUILD_SRC/Dockerfile" /opt/opensaas/server-build/
cp "$BUILD_SRC/package.json" /opt/opensaas/server-build/
cp "$BUILD_SRC/package-lock.json" /opt/opensaas/server-build/
cp "$BUILD_SRC/tsconfig.json" /opt/opensaas/server-build/ 2>/dev/null || true
echo "后端构建产物已复制"

echo "=== Step 8: 复制新前端构建 ==="
rm -rf /opt/opensaas/client-build/*
cp -r "$BUILD_SRC/web-app/build/"* /opt/opensaas/client-build/
echo "前端构建产物已复制"

echo "=== Step 9: 重建并重启容器 ==="
cd /opt/opensaas
docker compose down server client
docker compose build --no-cache server
docker compose up -d server client

echo ""
echo "=== 完成！等待服务启动... ==="
sleep 5
docker compose ps
echo ""
echo "查看后端日志: cd /opt/opensaas && docker compose logs -f server"
