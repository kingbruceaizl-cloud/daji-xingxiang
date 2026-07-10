#!/bin/zsh -l

set -u

PROJECT_DIR="${0:A:h}"
SERVICE_LABEL="com.daji.xingxiang.local"
SERVICE_DOMAIN="gui/$(id -u)/$SERVICE_LABEL"
PORT_FILE="$PROJECT_DIR/.daji-local.port"
LOG_DIR="$HOME/Library/Logs/DajiXingxiang"
LOG_FILE="$LOG_DIR/local.log"
ERROR_LOG_FILE="$LOG_DIR/local-error.log"
OLD_PID_FILE="$PROJECT_DIR/.daji-local.pid"

cd "$PROJECT_DIR" || exit 1

pause_on_error() {
  echo
  echo "启动没有完成。按任意键关闭窗口。"
  read -k 1
  echo
}

service_is_loaded() {
  launchctl print "$SERVICE_DOMAIN" >/dev/null 2>&1
}

wait_for_site() {
  local url="$1"
  local attempts="$2"

  for ((index = 1; index <= attempts; index++)); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

echo "正在启动大吉形象..."

if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js。请先安装 Node.js 20 或更高版本。"
  pause_on_error
  exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
  PNPM_COMMAND=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  PNPM_COMMAND=(corepack pnpm)
else
  echo "未找到 pnpm。请先安装 pnpm。"
  pause_on_error
  exit 1
fi

if service_is_loaded; then
  EXISTING_PORT=$(cat "$PORT_FILE" 2>/dev/null || true)

  if [[ "$EXISTING_PORT" == <-> ]]; then
    EXISTING_URL="http://localhost:$EXISTING_PORT"
    echo "检测到大吉形象已经在运行，正在打开页面..."

    if wait_for_site "$EXISTING_URL" 15; then
      open "$EXISTING_URL"
      echo "已打开：$EXISTING_URL"
      exit 0
    fi
  fi

  echo "旧服务没有正常响应，正在重新启动..."
  launchctl remove "$SERVICE_LABEL" >/dev/null 2>&1 || true
  sleep 1
fi

rm -f "$PORT_FILE" "$OLD_PID_FILE"

if [[ ! -f "$PROJECT_DIR/node_modules/next/dist/bin/next" ]]; then
  echo "首次启动需要安装项目依赖，请稍候..."
  if ! "${PNPM_COMMAND[@]}" install; then
    echo "项目依赖安装失败。"
    pause_on_error
    exit 1
  fi
fi

echo "正在准备最新页面，请稍候..."
if ! "${PNPM_COMMAND[@]}" run build; then
  echo "页面构建失败，请查看上面的错误信息。"
  pause_on_error
  exit 1
fi

PORT=3000
while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
  if (( PORT > 3010 )); then
    echo "3000 到 3010 端口都被占用，无法启动。"
    pause_on_error
    exit 1
  fi
done

NODE_BIN=$(command -v node)
NEXT_CLI="$PROJECT_DIR/node_modules/next/dist/bin/next"
URL="http://localhost:$PORT"

echo "正在启动 macOS 后台服务，本次地址：$URL"
mkdir -p "$LOG_DIR"
: > "$LOG_FILE"
: > "$ERROR_LOG_FILE"

if ! launchctl submit \
  -l "$SERVICE_LABEL" \
  -o "$LOG_FILE" \
  -e "$ERROR_LOG_FILE" \
  -- /usr/bin/env \
  "PATH=$PATH" \
  "HOME=$HOME" \
  "USER=$USER" \
  "$NODE_BIN" "$NEXT_CLI" start "$PROJECT_DIR" \
  --hostname 127.0.0.1 \
  --port "$PORT"; then
  echo "macOS 后台服务创建失败。"
  pause_on_error
  exit 1
fi

echo "$PORT" > "$PORT_FILE"

if wait_for_site "$URL" 60; then
  open "$URL"
  echo
  echo "大吉形象已启动并打开。"
  echo "地址：$URL"
  echo "关闭这个终端窗口不会停止服务。"
  exit 0
fi

echo "本地服务启动超时，最后一段运行日志如下："
echo
tail -n 30 "$LOG_FILE" 2>/dev/null || true
tail -n 30 "$ERROR_LOG_FILE" 2>/dev/null || true
launchctl remove "$SERVICE_LABEL" >/dev/null 2>&1 || true
rm -f "$PORT_FILE"
pause_on_error
exit 1
