#!/bin/zsh -l

set -u

PROJECT_DIR="${0:A:h}"
SERVICE_LABEL="com.daji.xingxiang.local"
SERVICE_DOMAIN="gui/$(id -u)/$SERVICE_LABEL"
PORT_FILE="$PROJECT_DIR/.daji-local.port"
OLD_PID_FILE="$PROJECT_DIR/.daji-local.pid"

cd "$PROJECT_DIR" || exit 1

if launchctl print "$SERVICE_DOMAIN" >/dev/null 2>&1; then
  launchctl remove "$SERVICE_LABEL" >/dev/null 2>&1 || true

  for ((index = 1; index <= 10; index++)); do
    if ! launchctl print "$SERVICE_DOMAIN" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  echo "大吉形象本地服务已停止。"
else
  echo "没有发现正在运行的大吉形象服务，已清理旧记录。"
fi

rm -f "$PORT_FILE" "$OLD_PID_FILE"
sleep 2
