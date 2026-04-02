#!/bin/bash
# PivotGrid Mini - Control Script
VERSION="1.0.0"
PROJECT_NAME="PivotGrid"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME_LOWER="$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]')"
FRONTEND_LOG="/tmp/${PROJECT_NAME_LOWER}_frontend.log"

PORTS_FILE="$SCRIPT_DIR/.run_ports"
DEFAULT_FRONTEND_PORT=5173

if [ -f "$PORTS_FILE" ]; then
    source "$PORTS_FILE"
else
    FRONTEND_PORT=$DEFAULT_FRONTEND_PORT
fi

get_free_port() {
    local port=$1
    while lsof -ti:${port} >/dev/null 2>&1; do port=$((port + 1)); done
    echo $port
}

show_help() {
    echo -e "${BLUE}${PROJECT_NAME} Control Script v${VERSION}${NC}"
    echo "Usage: ./run.sh [command]"
    echo "  start     Start dev server"
    echo "  stop      Stop dev server"
    echo "  restart   Restart dev server"
    echo "  status    Show server status"
    echo "  live      Start and stream logs"
}

check_status() {
    echo -e "${BLUE}--- ${PROJECT_NAME} Status ---${NC}"
    if lsof -ti:${FRONTEND_PORT} >/dev/null 2>&1; then
        echo -e "Dev Server (Vite) is ${GREEN}RUNNING${NC} on port ${FRONTEND_PORT}"
    else
        echo -e "Dev Server (Vite) is ${RED}STOPPED${NC}"
    fi
}

stop_servers() {
    echo -e "${RED}Shutting down ${PROJECT_NAME}...${NC}"
    lsof -ti:${FRONTEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
    pkill -9 -f "vite.*${SCRIPT_DIR}" 2>/dev/null || true
    sleep 1
    rm -f "$PORTS_FILE"
    echo -e "${GREEN}Shutdown complete.${NC}"
}

start_servers() {
    echo -e "${GREEN}Starting ${PROJECT_NAME}...${NC}"

    # Install deps if needed
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        echo "Installing dependencies..."
        (cd "$SCRIPT_DIR" && npm install)
    fi

    FRONTEND_PORT=$(get_free_port $DEFAULT_FRONTEND_PORT)
    echo "FRONTEND_PORT=$FRONTEND_PORT" > "$PORTS_FILE"

    lsof -ti:${FRONTEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
    sleep 1

    : > "$FRONTEND_LOG"
    (cd "$SCRIPT_DIR" && nohup "$SCRIPT_DIR/node_modules/.bin/vite" --port ${FRONTEND_PORT} --host \
        >> "$FRONTEND_LOG" 2>&1 &)

    echo -n "Waiting for server"
    local waited=0
    while ! lsof -ti:${FRONTEND_PORT} >/dev/null 2>&1 && [ $waited -lt 15 ]; do
        sleep 1; waited=$((waited + 1)); echo -n "."
    done
    echo ""

    if lsof -ti:${FRONTEND_PORT} >/dev/null 2>&1; then
        echo -e "${GREEN}Server ready: ${BLUE}http://localhost:${FRONTEND_PORT}${NC}"
    else
        echo -e "${YELLOW}Server may still be starting. Check: tail -f $FRONTEND_LOG${NC}"
    fi
}

live_logs() {
    if ! lsof -ti:${FRONTEND_PORT} >/dev/null 2>&1; then
        start_servers; sleep 2
    fi
    touch "$FRONTEND_LOG"
    echo -e "${YELLOW}Streaming logs (Ctrl+C to stop):${NC}"
    tail -n 30 -f "$FRONTEND_LOG"
}

case "$1" in
    start) start_servers ;;
    stop) stop_servers ;;
    restart) stop_servers; sleep 2; start_servers ;;
    status) check_status ;;
    live) live_logs ;;
    -h|--h|help) show_help ;;
    -v) echo "${PROJECT_NAME} v${VERSION}" ;;
    *) echo -e "${RED}Unknown: '$1'${NC}"; show_help; exit 1 ;;
esac
