#!/bin/bash
set -e

echo "=== Step 1: 更新 docker-compose.yml 环境变量 ==="

COMPOSE_FILE="/opt/opensaas/docker-compose.yml"

# 替换 OPENAI_API_KEY 为 NVIDIA_API_KEY
sed -i 's|OPENAI_API_KEY:.*|NVIDIA_API_KEY: "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"|' "$COMPOSE_FILE"

echo "已替换 OPENAI_API_KEY -> NVIDIA_API_KEY"

echo "=== Step 2: 备份旧构建 ==="
BACKUP_DIR="/opt/opensaas/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /opt/opensaas/server-build "$BACKUP_DIR/" 2>/dev/null || true
cp -r /opt/opensaas/client-build "$BACKUP_DIR/" 2>/dev/null || true
echo "备份已保存到 $BACKUP_DIR"

echo "=== Step 3: 清理旧构建 ==="
rm -rf /opt/opensaas/server-build/*
rm -rf /opt/opensaas/client-build/*

echo "=== Step 4: 复制新后端构建 ==="
# 从本地 .wasp/out 复制到服务器构建目录
# 先确认你有构建产物在这个路径
BUILD_SRC="/root/opencode/my-saas-app_20260327/app/.wasp/out"

if [ ! -d "$BUILD_SRC" ]; then
    echo "ERROR: 本地构建产物不存在: $BUILD_SRC"
    echo "请确保你已从仓库拉取最新代码并运行了 wasp build"
    exit 1
fi

# 复制后端构建产物
cp -r "$BUILD_SRC/server" /opt/opensaas/server-build/
cp -r "$BUILD_SRC/sdk" /opt/opensaas/server-build/
cp -r "$BUILD_SRC/libs" /opt/opensaas/server-build/
cp -r "$BUILD_SRC/db" /opt/opensaas/server-build/
cp -r "$BUILD_SRC/src" /opt/opensaas/server-build/
cp "$BUILD_SRC/Dockerfile" /opt/opensaas/server-build/
cp "$BUILD_SRC/package.json" /opt/opensaas/server-build/
cp "$BUILD_SRC/package-lock.json" /opt/opensaas/server-build/
cp "$BUILD_SRC/tsconfig.json" /opt/opensaas/server-build/ 2>/dev/null || true
cp "$BUILD_SRC/installedNpmDepsLog.json" /opt/opensaas/server-build/ 2>/dev/null || true
echo "后端构建产物已复制"

echo "=== Step 5: 复制新前端构建 ==="
mkdir -p /opt/opensaas/client-build
cp -r "$BUILD_SRC/web-app/build/"* /opt/opensaas/client-build/
echo "前端构建产物已复制"

echo "=== Step 6: 重建并重启容器 ==="
cd /opt/opensaas
docker compose down server client
docker compose build server
docker compose up -d server client

echo ""
echo "=== 完成！==="
echo "等待服务启动..."
sleep 5
docker compose ps
echo ""
echo "查看后端日志: docker compose logs -f server"
