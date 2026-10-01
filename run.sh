#!/bin/bash
# PivotGrid Mini - Control Script
#
# Modes (2026-10-01, same rules as pm-master-chad/run.sh)
#   start / restart  production mode: `vite build` (only when the code changed) + `vite preview`
#   dev              development mode: `vite` dev server (hot reload)
# `start` is idempotent: if this app already runs healthy in the requested mode it
# does nothing, so a second call cannot spawn a duplicate server. Own processes are
# found by their working directory.
VERSION="1.1.0"
PROJECT_NAME="PivotGrid"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_NAME_LOWER="$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]')"
FRONTEND_LOG="/tmp/${PROJECT_NAME_LOWER}_frontend.log"
VITE="$SCRIPT_DIR/node_modules/.bin/vite"
BUILD_STAMP="$SCRIPT_DIR/dist/.run_build_stamp"

PORTS_FILE="$SCRIPT_DIR/.run_ports"
DEFAULT_FRONTEND_PORT=5173

FRONTEND_PORT=$DEFAULT_FRONTEND_PORT
RUN_MODE=""
if [ -f "$PORTS_FILE" ]; then
    source "$PORTS_FILE"
fi

get_free_port() {
    local port=$1
    while lsof -Pi :${port} -sTCP:LISTEN -t >/dev/null 2>&1; do port=$((port + 1)); done
    echo $port
}

show_help() {
    echo -e "${BLUE}${PROJECT_NAME} Control Script v${VERSION}${NC}"
    echo "Usage: ./run.sh [command]"
    echo "  start     Start in production mode (no-op if already running in that mode)"
    echo "  restart   Stop and start again in production mode"
    echo "  dev       Switch to / start development mode (hot reload)"
    echo "  build     Force a fresh production build, then restart in production mode"
    echo "  stop      Stop the server"
    echo "  status    Show mode, port and health"
    echo "  live      Start if needed and stream logs"
}

_own_pids() {
    local pid cwd
    for pid in $(pgrep -f "vite|node|esbuild" 2>/dev/null); do
        cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')
        [ "$cwd" = "$SCRIPT_DIR" ] && echo "$pid"
    done
}

_port_owned() {
    local own pid
    own=" $(_own_pids | tr '\n' ' ') "
    for pid in $(lsof -Pi :"$1" -sTCP:LISTEN -t 2>/dev/null); do
        case "$own" in *" $pid "*) return 0 ;; esac
    done
    return 1
}

_healthy() {
    _port_owned "$FRONTEND_PORT" && \
        [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' "http://localhost:${FRONTEND_PORT}/" 2>/dev/null)" = "200" ]
}

check_status() {
    echo -e "${BLUE}--- ${PROJECT_NAME} Status ---${NC}"
    echo -e "Mode   : ${GREEN}${RUN_MODE:-unknown}${NC}"
    if _healthy; then
        echo -e "Server (Vite) is ${GREEN}RUNNING${NC} on port ${FRONTEND_PORT}"
    else
        echo -e "Server (Vite) is ${RED}STOPPED${NC}"
    fi
}

_kill_all() {
    local pids
    pids=$(_own_pids)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill 2>/dev/null || true
        sleep 2
        pids=$(_own_pids)
        [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
}

_build_key() {
    local head dirty
    head=$(git -C "$SCRIPT_DIR" rev-parse HEAD 2>/dev/null || echo nogit)
    dirty=$(git -C "$SCRIPT_DIR" status --porcelain -- . 2>/dev/null | md5 -q 2>/dev/null || echo x)
    echo "head=${head} dirty=${dirty}"
}

_build() {
    local force=${1:-false} key
    key=$(_build_key)
    if [ "$force" != "true" ] && [ -f "$BUILD_STAMP" ] && [ -f "$SCRIPT_DIR/dist/index.html" ] \
        && [ "$(cat "$BUILD_STAMP")" = "$key" ]; then
        echo "   Production build is up to date (skip build)"
        return 0
    fi
    echo "   Building for production..."
    # `vite build` only (the npm script also runs tsc; type checking is a development gate)
    if (cd "$SCRIPT_DIR" && "$VITE" build >> "$FRONTEND_LOG" 2>&1); then
        echo "$key" > "$BUILD_STAMP"
        echo -e "   ${GREEN}✓ Build finished${NC}"
        return 0
    fi
    echo -e "   ${RED}✗ Build failed — see $FRONTEND_LOG${NC}"
    return 1
}

stop_servers() {
    echo -e "${RED}Shutting down ${PROJECT_NAME}...${NC}"
    _kill_all
    rm -f "$PORTS_FILE"
    echo -e "${GREEN}Shutdown complete.${NC}"
}

# start_servers MODE [force_build]   MODE = prod | dev
start_servers() {
    local mode=${1:-prod} force_build=${2:-false}
    echo -e "${GREEN}Starting ${PROJECT_NAME} (${mode})...${NC}"

    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        echo "Installing dependencies..."
        (cd "$SCRIPT_DIR" && npm install)
    fi

    if [ "$force_build" != "true" ] && [ "$RUN_MODE" = "$mode" ] && _healthy; then
        echo -e "${GREEN}Already running (${mode}) — nothing to do: ${BLUE}http://localhost:${FRONTEND_PORT}${NC}"
        return 0
    fi

    _kill_all
    FRONTEND_PORT=$(get_free_port $DEFAULT_FRONTEND_PORT)
    RUN_MODE=$mode

    : > "$FRONTEND_LOG"
    if [ "$mode" = "prod" ] && _build "$force_build"; then
        (cd "$SCRIPT_DIR" && nohup "$VITE" preview --port ${FRONTEND_PORT} --strictPort --host \
            >> "$FRONTEND_LOG" 2>&1 &)
    else
        if [ "$mode" = "prod" ]; then
            echo -e "${YELLOW}⚠ Falling back to development mode${NC}"
            RUN_MODE=dev
        fi
        (cd "$SCRIPT_DIR" && nohup "$VITE" --port ${FRONTEND_PORT} --strictPort --host \
            >> "$FRONTEND_LOG" 2>&1 &)
    fi
    {
        echo "FRONTEND_PORT=$FRONTEND_PORT"
        echo "RUN_MODE=$RUN_MODE"
    } > "$PORTS_FILE"

    echo -n "Waiting for server"
    local waited=0
    while ! _healthy && [ $waited -lt 20 ]; do
        sleep 1; waited=$((waited + 1)); echo -n "."
    done
    echo ""

    if _healthy; then
        echo -e "${GREEN}Server ready (${RUN_MODE}): ${BLUE}http://localhost:${FRONTEND_PORT}${NC}"
    else
        echo -e "${YELLOW}Server may still be starting. Check: tail -f $FRONTEND_LOG${NC}"
    fi
}

live_logs() {
    if ! _healthy; then
        start_servers "${RUN_MODE:-prod}"; sleep 2
    fi
    touch "$FRONTEND_LOG"
    echo -e "${YELLOW}Streaming logs (Ctrl+C to stop):${NC}"
    tail -n 30 -f "$FRONTEND_LOG"
}

case "$1" in
    start|prod) start_servers prod ;;
    dev) start_servers dev ;;
    build) start_servers prod true ;;
    stop) stop_servers ;;
    restart) stop_servers; sleep 2; RUN_MODE=""; start_servers prod ;;
    status) check_status ;;
    live) live_logs ;;
    -h|--h|help) show_help ;;
    -v) echo "${PROJECT_NAME} v${VERSION}" ;;
    *) echo -e "${RED}Unknown: '$1'${NC}"; show_help; exit 1 ;;
esac
