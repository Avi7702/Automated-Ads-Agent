# Prompt Engineer Portable Package - File Manifest

Generated: 2026-02-15

## Files Included (17 total)

### Agents (3 files)

| File                            | Source                                    | Size        |
| ------------------------------- | ----------------------------------------- | ----------- |
| `agents/spec-interviewer.md`    | `~/.claude/agents/spec-interviewer.md`    | 2,303 bytes |
| `agents/feature-implementer.md` | `~/.claude/agents/feature-implementer.md` | 2,819 bytes |
| `agents/spec-verifier.md`       | `~/.claude/agents/spec-verifier.md`       | 2,952 bytes |

### Hooks (1 file)

| File                           | Source                                   | Size        |
| ------------------------------ | ---------------------------------------- | ----------- |
| `hooks/teammate-idle-check.js` | `~/.claude/hooks/teammate-idle-check.js` | 1,226 bytes |

### Templates (5 files)

| File                         | Source                                                        | Size        |
| ---------------------------- | ------------------------------------------------------------- | ----------- |
| `templates/feature.xml`      | `~/.claude/skills/prompt-engineer/templates/feature.xml`      | 3,215 bytes |
| `templates/bug-fix.xml`      | `~/.claude/skills/prompt-engineer/templates/bug-fix.xml`      | 2,822 bytes |
| `templates/code-review.xml`  | `~/.claude/skills/prompt-engineer/templates/code-review.xml`  | 4,308 bytes |
| `templates/test.xml`         | `~/.claude/skills/prompt-engineer/templates/test.xml`         | 3,620 bytes |
| `templates/SPEC-TEMPLATE.md` | `~/.claude/skills/prompt-engineer/templates/SPEC-TEMPLATE.md` | 3,036 bytes |

### Root Files (5 files)

| File                 | Source                                                | Size         |
| -------------------- | ----------------------------------------------------- | ------------ |
| `SDD-METHODOLOGY.md` | `~/.claude/skills/prompt-engineer/SDD-METHODOLOGY.md` | 36,743 bytes |
| `SKILL.md`           | `~/.claude/skills/prompt-engineer/SKILL.md`           | 8,981 bytes  |
| `rules.md`           | `~/.claude/skills/prompt-engineer/rules.md`           | 7,369 bytes  |
| `INSTALL.sh`         | `~/.claude/skills/prompt-engineer/INSTALL.sh`         | 2,459 bytes  |
| `README.md`          | `~/.claude/skills/prompt-engineer/README.md`          | 5,814 bytes  |
| `PROJECT-SETUP.md`   | New — per-project setup guide                         | ~3,500 bytes |

## Excluded Files (by design)

- `enhance-teammate-prompts.sh` - orphaned hook, deleted
- `enhance-teammate-prompts.yaml` - orphaned config, deleted
- Python scripts (`*.py`) - from ECC plugin, not part of this package
- `hooks.json` - ECC plugin config, not part of this package

### Meta Files (2 files)

| File           | Purpose                                |
| -------------- | -------------------------------------- |
| `MANIFEST.md`  | This file — lists all package contents |
| `CHANGELOG.md` | Full history of what changed and why   |

## Notes

- Package is project-agnostic. Install in any Claude Code project with `bash INSTALL.sh`.
- All `npm` references have been replaced with `pnpm`.
- All stale hook references have been removed.
