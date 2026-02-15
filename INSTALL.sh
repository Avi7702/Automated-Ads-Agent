#!/bin/bash

# Prompt Engineer Skill - Portable Installation Script
# Installs SDD agents, templates, rules, and idle-check hook.
# Safe to run multiple times (idempotent).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"

echo ""
echo "=== Prompt Engineer Skill Installer ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Validate package contents
# ---------------------------------------------------------------------------
REQUIRED_FILES=(
    "$SCRIPT_DIR/SKILL.md"
    "$SCRIPT_DIR/rules.md"
    "$SCRIPT_DIR/SDD-METHODOLOGY.md"
    "$SCRIPT_DIR/agents/spec-interviewer.md"
    "$SCRIPT_DIR/agents/feature-implementer.md"
    "$SCRIPT_DIR/agents/spec-verifier.md"
    "$SCRIPT_DIR/hooks/teammate-idle-check.js"
    "$SCRIPT_DIR/templates/feature.xml"
    "$SCRIPT_DIR/templates/bug-fix.xml"
    "$SCRIPT_DIR/templates/code-review.xml"
    "$SCRIPT_DIR/templates/test.xml"
    "$SCRIPT_DIR/templates/SPEC-TEMPLATE.md"
)

MISSING=0
for f in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$f" ]; then
        echo "ERROR: Missing package file: $f"
        MISSING=1
    fi
done
if [ "$MISSING" -eq 1 ]; then
    echo ""
    echo "Package is incomplete. Re-download or rebuild before installing."
    exit 1
fi

# ---------------------------------------------------------------------------
# 2. Create target directories
# ---------------------------------------------------------------------------
echo "Creating directories..."
mkdir -p "$CLAUDE_DIR/agents"
mkdir -p "$CLAUDE_DIR/skills/prompt-engineer/templates"
mkdir -p "$CLAUDE_DIR/hooks"

# ---------------------------------------------------------------------------
# Helper: copy with backup
# ---------------------------------------------------------------------------
safe_copy() {
    local src="$1"
    local dst="$2"
    if [ -f "$dst" ]; then
        cp "$dst" "${dst}.bak"
    fi
    cp "$src" "$dst"
}

# ---------------------------------------------------------------------------
# 3. Install agents -> ~/.claude/agents/
# ---------------------------------------------------------------------------
echo "Installing SDD agents..."
safe_copy "$SCRIPT_DIR/agents/spec-interviewer.md"    "$CLAUDE_DIR/agents/spec-interviewer.md"
safe_copy "$SCRIPT_DIR/agents/feature-implementer.md" "$CLAUDE_DIR/agents/feature-implementer.md"
safe_copy "$SCRIPT_DIR/agents/spec-verifier.md"       "$CLAUDE_DIR/agents/spec-verifier.md"

# ---------------------------------------------------------------------------
# 4. Install skill files -> ~/.claude/skills/prompt-engineer/
# ---------------------------------------------------------------------------
echo "Installing skill files..."
safe_copy "$SCRIPT_DIR/SKILL.md"            "$CLAUDE_DIR/skills/prompt-engineer/SKILL.md"
safe_copy "$SCRIPT_DIR/rules.md"            "$CLAUDE_DIR/skills/prompt-engineer/rules.md"
safe_copy "$SCRIPT_DIR/SDD-METHODOLOGY.md"  "$CLAUDE_DIR/skills/prompt-engineer/SDD-METHODOLOGY.md"

# ---------------------------------------------------------------------------
# 5. Install templates -> ~/.claude/skills/prompt-engineer/templates/
# ---------------------------------------------------------------------------
echo "Installing prompt templates..."
safe_copy "$SCRIPT_DIR/templates/feature.xml"       "$CLAUDE_DIR/skills/prompt-engineer/templates/feature.xml"
safe_copy "$SCRIPT_DIR/templates/bug-fix.xml"       "$CLAUDE_DIR/skills/prompt-engineer/templates/bug-fix.xml"
safe_copy "$SCRIPT_DIR/templates/code-review.xml"   "$CLAUDE_DIR/skills/prompt-engineer/templates/code-review.xml"
safe_copy "$SCRIPT_DIR/templates/test.xml"           "$CLAUDE_DIR/skills/prompt-engineer/templates/test.xml"
safe_copy "$SCRIPT_DIR/templates/SPEC-TEMPLATE.md"  "$CLAUDE_DIR/skills/prompt-engineer/templates/SPEC-TEMPLATE.md"

# ---------------------------------------------------------------------------
# 6. Install idle-check hook -> ~/.claude/hooks/
# ---------------------------------------------------------------------------
echo "Installing teammate-idle-check hook..."
safe_copy "$SCRIPT_DIR/hooks/teammate-idle-check.js" "$CLAUDE_DIR/hooks/teammate-idle-check.js"

# ---------------------------------------------------------------------------
# 7. Copy SPEC-TEMPLATE.md to project specs/ directory (if detectable)
# ---------------------------------------------------------------------------
PROJECT_DIR=""
if [ -d ".claude" ] && [ "$(cd . && pwd)" != "$HOME" ]; then
    PROJECT_DIR="$(pwd)"
elif [ -n "$CLAUDE_PROJECT_DIR" ]; then
    PROJECT_DIR="$CLAUDE_PROJECT_DIR"
fi

if [ -n "$PROJECT_DIR" ]; then
    echo "Copying SPEC-TEMPLATE.md to project specs/..."
    mkdir -p "$PROJECT_DIR/specs"
    safe_copy "$SCRIPT_DIR/templates/SPEC-TEMPLATE.md" "$PROJECT_DIR/specs/SPEC-TEMPLATE.md"
fi

# ---------------------------------------------------------------------------
# 8. Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Installation Complete ==="
echo ""
echo "  Agents (3):    $CLAUDE_DIR/agents/"
echo "    - spec-interviewer.md"
echo "    - feature-implementer.md"
echo "    - spec-verifier.md"
echo ""
echo "  Skill files:   $CLAUDE_DIR/skills/prompt-engineer/"
echo "    - SKILL.md"
echo "    - rules.md"
echo "    - SDD-METHODOLOGY.md"
echo ""
echo "  Templates (5): $CLAUDE_DIR/skills/prompt-engineer/templates/"
echo "    - feature.xml, bug-fix.xml, code-review.xml, test.xml"
echo "    - SPEC-TEMPLATE.md"
echo ""
echo "  Hook:          $CLAUDE_DIR/hooks/teammate-idle-check.js"
echo ""
if [ -n "$PROJECT_DIR" ]; then
    echo "  Spec template: $PROJECT_DIR/specs/SPEC-TEMPLATE.md"
    echo ""
fi
echo "Next steps:"
echo "  1. Spawn spec-interviewer to create a feature spec"
echo "  2. Spawn feature-implementer to build from the spec"
echo "  3. Spawn spec-verifier to verify the implementation"
echo ""
