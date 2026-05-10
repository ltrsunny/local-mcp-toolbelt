#!/usr/bin/env bash
# enforce-bridge.sh — PreToolUse hook that blocks direct reads of large
# external files, forcing Claude to route through the local-mcp-toolbelt
# bridge (mcp__local-mcp-toolbelt__{summarize-long,extract,classify}).
#
# Why: project memory rule "use bridge for >1KB external content" is soft
# and was repeatedly ignored. This is the hard-enforcement layer.
#
# Reads hook input JSON from stdin. Exits 0 to allow, exits 2 to block
# (Claude sees the stderr message and must adapt).
#
# Allow-list (no enforcement):
#   - paths under $CLAUDE_PROJECT_DIR (project source / docs)
#   - paths under ~/.claude/ (Claude internal memory + transcripts)
#   - paths under ~/.omlx/ (oMLX models, server logs)
#   - files <= 1024 bytes (cheap reads, not worth bridge round-trip)
#   - small allow-listed extensions inside any size class
#     (.json + .yaml: usually config metadata; bridge can't help)

set -euo pipefail

THRESHOLD_BYTES=1024
ALLOWED_PREFIXES=(
  "${CLAUDE_PROJECT_DIR:-/Users/rd/ollama-claude}"
  "${HOME}/.claude"
  "${HOME}/.omlx"
)

# Read the hook input JSON.
INPUT="$(cat)"
TOOL_NAME="$(jq -r '.tool_name // ""' <<<"$INPUT")"

# Tilde-expand and resolve to an absolute path. Returns "" if file does
# not exist (we don't block reads of non-existent files — Read will
# error naturally).
resolve_path() {
  local p="${1:-}"
  [ -z "$p" ] && { echo ""; return; }
  case "$p" in
    "~/"*) p="${HOME}/${p:2}" ;;
    "~"*)  p="${HOME}${p:1}" ;;
  esac
  if [ -f "$p" ]; then
    # macOS realpath: greadlink -f if available, else just print as-is
    if command -v greadlink >/dev/null 2>&1; then
      greadlink -f "$p"
    else
      printf '%s\n' "$p"
    fi
  else
    echo ""
  fi
}

# Returns 0 if path is allowed (under project or claude/omlx dirs),
# 1 if it should be checked for size + bridge enforcement.
is_allowed_path() {
  local p="$1"
  for prefix in "${ALLOWED_PREFIXES[@]}"; do
    case "$p" in
      "${prefix}/"*|"$prefix") return 0 ;;
    esac
  done
  return 1
}

# Returns 0 if the file is large enough to require bridge routing.
needs_bridge() {
  local p="$1"
  [ -f "$p" ] || return 1
  local size
  size="$(stat -f%z "$p" 2>/dev/null || stat -c%s "$p" 2>/dev/null || echo 0)"
  [ "$size" -gt "$THRESHOLD_BYTES" ]
}

emit_block_message() {
  local p="$1"
  local size
  size="$(stat -f%z "$p" 2>/dev/null || stat -c%s "$p" 2>/dev/null || echo 0)"
  cat >&2 <<EOF
[bridge enforcement]
File: $p ($size bytes)
This file is outside the project + larger than ${THRESHOLD_BYTES} bytes.

Direct read brings raw bytes into your context — defeats the whole point
of the bridge. Route through the local model instead:

  mcp__local-mcp-toolbelt__summarize-long  source_uri="file://$p"
  mcp__local-mcp-toolbelt__extract         source_uri="file://$p"  schema={...}
  mcp__local-mcp-toolbelt__classify        text="..."  categories=[...]

Pick the tool that matches the task. The bridge runs Qwen3-4B/8B/14B on
oMLX locally — no Claude tokens spent on prefill of this file.

If you genuinely need raw read (precise edit, code surgery): the file
must be <= 1KB OR inside the project / .claude / .omlx tree.
EOF
}

# Tool dispatch.
case "$TOOL_NAME" in
  Read)
    PATH_RAW="$(jq -r '.tool_input.file_path // ""' <<<"$INPUT")"
    PATH_ABS="$(resolve_path "$PATH_RAW")"
    [ -z "$PATH_ABS" ] && exit 0  # nonexistent or empty — let Read error itself
    if is_allowed_path "$PATH_ABS"; then exit 0; fi
    if needs_bridge "$PATH_ABS"; then
      emit_block_message "$PATH_ABS"
      exit 2
    fi
    exit 0
    ;;

  Bash)
    CMD="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
    # Only block when a stdout-reader command is present in the line.
    # Path-mutating commands (rm, mv, chmod, mkdir) and script runners
    # (python3, node, sh, vim) don't pipe file content into Claude's
    # context, so they're not enforcement targets.
    #
    # Reader vocabulary: cat head tail less more awk sed grep rg jq yq
    # xxd od hexdump strings tac rev nl cut. If none appear as a word
    # in the command, allow without further inspection.
    # Match reader command only at COMMAND POSITION:
    #   - start of the command line, OR
    #   - after a pipeline/sequence operator (| ; && || or open-paren),
    # followed by optional whitespace and a reader word followed by
    # whitespace.
    #
    # This avoids false positives when reader words appear inside quoted
    # strings (e.g. `git commit -m "show cat output"` or `echo "use head"`).
    READER_RE='(^|[|;&(])[[:space:]]*(cat|head|tail|less|more|awk|sed|grep|rg|jq|yq|xxd|od|hexdump|strings|tac|rev|nl|cut)[[:space:]]'
    if ! printf '%s ' "$CMD" | grep -qE "$READER_RE"; then
      exit 0
    fi
    # Strip redirection targets — `> path`, `>> path`, `2> path`, `&> path`
    # are WRITES, not reads, and shouldn't trigger bridge enforcement even
    # if a large file already exists at that path.
    CMD_SCAN="$(printf '%s' "$CMD" | sed -E 's|[0-9]?>>?[[:space:]]*[^[:space:]|;&]+||g')"
    # Reader present — now scan tokens for large external paths.
    while read -r tok; do
      # strip surrounding quotes
      tok="${tok#\"}"; tok="${tok%\"}"
      tok="${tok#\'}"; tok="${tok%\'}"
      case "$tok" in
        "/tmp/"*|"/var/"*|"~/"*|"/Users/"*|"/etc/"*)
          PATH_ABS="$(resolve_path "$tok")"
          [ -z "$PATH_ABS" ] && continue
          if is_allowed_path "$PATH_ABS"; then continue; fi
          if needs_bridge "$PATH_ABS"; then
            emit_block_message "$PATH_ABS"
            exit 2
          fi
          ;;
      esac
    done < <(printf '%s\n' "$CMD_SCAN" | tr -s '[:space:]' '\n')
    exit 0
    ;;

  *)
    exit 0
    ;;
esac
