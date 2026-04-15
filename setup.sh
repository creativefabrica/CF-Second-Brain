#!/usr/bin/env bash
set -euo pipefail

# ── CF-Second-Brain Setup Script ──────────────────────────────────
# Installs dependencies, builds the server, and configures your
# editor(s) to use the MCP server and skills.
#
# Usage:  ./setup.sh [--vault-path /path/to/vault]
#
# Idempotent — safe to run multiple times.
# ──────────────────────────────────────────────────────────────────

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
VAULT_PATH=""

# ── Parse arguments ──────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --vault-path)
      VAULT_PATH="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: ./setup.sh [--vault-path /path/to/vault]"
      echo ""
      echo "Options:"
      echo "  --vault-path  Custom Obsidian vault location (default: <repo>/vault/)"
      echo "  -h, --help    Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ── Colors ───────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}ℹ${NC}  $1"; }
ok()    { echo -e "${GREEN}✓${NC}  $1"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $1"; }
fail()  { echo -e "${RED}✗${NC}  $1"; }

echo ""
echo "═══════════════════════════════════════════════════"
echo "  CF-Second-Brain — Setup"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Prerequisites ────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  fail "Node.js not found. Install it first: https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 18 ]]; then
  fail "Node.js 18+ required (found $(node -v))"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  fail "npm not found."
  exit 1
fi

ok "Node.js $(node -v) / npm $(npm -v)"

# ── Install & Build ──────────────────────────────────────────────
info "Installing dependencies..."
cd "$REPO_DIR"
npm install --silent 2>/dev/null
ok "Dependencies installed"

info "Building TypeScript..."
npm run build --silent 2>/dev/null
ok "Build complete (dist/server.js)"

# ── Vault directories ────────────────────────────────────────────
EFFECTIVE_VAULT="${VAULT_PATH:-$REPO_DIR/vault}"

info "Ensuring vault directories exist at: $EFFECTIVE_VAULT"
for dir in decisions tasks meetings people projects weekly; do
  mkdir -p "$EFFECTIVE_VAULT/$dir"
done
ok "Vault directories ready"

# ── Detect editors ───────────────────────────────────────────────
CLAUDE_CODE=false
CURSOR=false

if [[ -d "$HOME/.claude" ]]; then
  CLAUDE_CODE=true
fi

if command -v cursor &> /dev/null || [[ -d "$HOME/.cursor" ]]; then
  CURSOR=true
fi

if [[ "$CLAUDE_CODE" == false && "$CURSOR" == false ]]; then
  warn "No supported editor detected (Claude Code or Cursor)"
  warn "You can configure manually — see README.md"
fi

# ── Claude Code setup ────────────────────────────────────────────
if [[ "$CLAUDE_CODE" == true ]]; then
  echo ""
  info "Configuring Claude Code..."

  # 1. Symlink skills directory
  SKILLS_TARGET="$HOME/.claude/skills/second-brain"
  SKILLS_SOURCE="$REPO_DIR/skills"

  mkdir -p "$HOME/.claude/skills"

  if [[ -L "$SKILLS_TARGET" ]]; then
    CURRENT_LINK=$(readlink "$SKILLS_TARGET")
    if [[ "$CURRENT_LINK" == "$SKILLS_SOURCE" ]]; then
      ok "Skills symlink already correct"
    else
      rm "$SKILLS_TARGET"
      ln -s "$SKILLS_SOURCE" "$SKILLS_TARGET"
      ok "Skills symlink updated → $SKILLS_SOURCE"
    fi
  elif [[ -d "$SKILLS_TARGET" ]]; then
    warn "Skills directory exists but is not a symlink: $SKILLS_TARGET"
    warn "Backing up to ${SKILLS_TARGET}.bak and creating symlink"
    mv "$SKILLS_TARGET" "${SKILLS_TARGET}.bak"
    ln -s "$SKILLS_SOURCE" "$SKILLS_TARGET"
    ok "Skills symlink created (backup at ${SKILLS_TARGET}.bak)"
  else
    ln -s "$SKILLS_SOURCE" "$SKILLS_TARGET"
    ok "Skills symlink created → $SKILLS_SOURCE"
  fi

  # 2. Build MCP server JSON entry
  MCP_COMMAND="node"
  MCP_ARGS="$REPO_DIR/dist/server.js"
  MCP_ENV=""
  if [[ -n "$VAULT_PATH" ]]; then
    MCP_ENV=", \"env\": { \"VAULT_PATH\": \"$VAULT_PATH\" }"
  fi

  echo ""
  info "Add this to your Claude Code MCP config (.mcp.json or project settings):"
  echo ""
  echo "  {\"mcpServers\": {\"second-brain\": {\"type\": \"stdio\", \"command\": \"$MCP_COMMAND\", \"args\": [\"$MCP_ARGS\"]$MCP_ENV}}}"
  echo ""

  ok "Claude Code configured"
fi

# ── Cursor setup ─────────────────────────────────────────────────
if [[ "$CURSOR" == true ]]; then
  echo ""
  info "Configuring Cursor..."

  # Symlink .mdc rule
  CURSOR_RULES_DIR="$HOME/.cursor/rules"
  MDC_TARGET="$CURSOR_RULES_DIR/second-brain.mdc"
  MDC_SOURCE="$REPO_DIR/skills/second-brain.mdc"

  if [[ ! -f "$MDC_SOURCE" ]]; then
    warn "Cursor rule file not found: $MDC_SOURCE"
    warn "Skipping Cursor rule symlink"
  else
    mkdir -p "$CURSOR_RULES_DIR"

    if [[ -L "$MDC_TARGET" ]]; then
      CURRENT_LINK=$(readlink "$MDC_TARGET")
      if [[ "$CURRENT_LINK" == "$MDC_SOURCE" ]]; then
        ok "Cursor rule symlink already correct"
      else
        rm "$MDC_TARGET"
        ln -s "$MDC_SOURCE" "$MDC_TARGET"
        ok "Cursor rule symlink updated → $MDC_SOURCE"
      fi
    elif [[ -f "$MDC_TARGET" ]]; then
      warn "Cursor rule exists but is not a symlink: $MDC_TARGET"
      warn "Backing up to ${MDC_TARGET}.bak and creating symlink"
      mv "$MDC_TARGET" "${MDC_TARGET}.bak"
      ln -s "$MDC_SOURCE" "$MDC_TARGET"
      ok "Cursor rule symlink created (backup at ${MDC_TARGET}.bak)"
    else
      ln -s "$MDC_SOURCE" "$MDC_TARGET"
      ok "Cursor rule symlink created → $MDC_SOURCE"
    fi
  fi

  # Build MCP config for Cursor
  MCP_ENV_CURSOR=""
  if [[ -n "$VAULT_PATH" ]]; then
    MCP_ENV_CURSOR=", \"env\": { \"VAULT_PATH\": \"$VAULT_PATH\" }"
  fi

  echo ""
  info "Add this to your Cursor MCP config (.cursor/mcp.json):"
  echo ""
  echo "  {\"mcpServers\": {\"second-brain\": {\"command\": \"node\", \"args\": [\"$REPO_DIR/dist/server.js\"]$MCP_ENV_CURSOR}}}"
  echo ""

  ok "Cursor configured"
fi

# ── Summary ──────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Setup Complete"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Repo:       $REPO_DIR"
echo "  Vault:      $EFFECTIVE_VAULT"
echo "  Server:     $REPO_DIR/dist/server.js"

if [[ "$CLAUDE_CODE" == true ]]; then
  echo "  Claude Code: skills symlinked"
fi
if [[ "$CURSOR" == true ]]; then
  echo "  Cursor:     rule symlinked"
fi

echo ""
echo "  Next: Open the vault directory in Obsidian"
echo "        $EFFECTIVE_VAULT"
echo ""
