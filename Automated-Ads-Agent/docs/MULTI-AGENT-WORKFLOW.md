# Multi-Agent Workflow Protocol

## Overview

This project uses multiple Claude Code agents working on different tasks. This document ensures coordination and prevents conflicts.

## Before Starting Work

### 1. Check Current State
```bash
git status
git branch -a
git log --oneline -5
```

### 2. Read Project Rules
- `CLAUDE.md` - Mandatory rules for all agents
- `docs/IMPLEMENTATION-TASKS.md` - Task specifications
- This file - Multi-agent coordination

### 3. Claim Your Task
Update `CLAUDE.md` task status table:
```markdown
| Task | Status | Branch | Agent |
|------|--------|--------|-------|
| 1.1 Rate Limiting | Complete | claude/task-1.1-rate-limiting | Agent 1 |
| 1.2 Authentication | In Progress | claude/task-1.2-auth | Agent 2 |
```

## During Work

### Branch Strategy
- Each task gets its own branch: `claude/task-X.X-description`
- Never commit directly to `master` or `main`
- Pull latest before starting: `git pull origin master`

### Avoiding Conflicts
1. **Check file ownership**: Before editing a file, check if another branch has changes
2. **Small, focused commits**: Easier to merge
3. **Communicate via CLAUDE.md**: Update status frequently

### File Locking (Soft)
If you're heavily modifying a file, note it:
```markdown
## Currently Being Modified
- `server/routes.ts` - Agent 2 (Task 1.2)
- `server/middleware/auth.ts` - Agent 2 (Task 1.2)
```

## After Completing Work

### 1. Run Full Verification
```bash
npm test
npm run build  # if applicable
```

### 2. Update Documentation
- Update `CLAUDE.md` task status
- Add any new files to "Key Files to Know"
- Document gotchas for next agent

### 3. Create Clean Commit
```bash
git add .
git commit -m "feat: description (Task X.X)"
git push -u origin claude/task-X.X-description
```

### 4. Handoff Notes
Add to `CLAUDE.md`:
```markdown
## Handoff Notes - Task X.X
- What was implemented
- Any known issues or limitations
- What the next agent should know
```

## Merge Protocol

### When Ready to Merge
1. All tests pass
2. Code review completed (via `/code-review`)
3. No conflicts with master
4. Documentation updated

### Merge Command
```bash
git checkout master
git pull origin master
git merge claude/task-X.X-description
git push origin master
```

## Conflict Resolution

If conflicts occur:
1. **Don't force push** - coordinate with other agents
2. **Rebase if clean**: `git rebase master`
3. **Merge if complex**: `git merge master` and resolve
4. **Document the resolution** in commit message

## Emergency Rollback

If something breaks:
```bash
git revert HEAD  # Revert last commit
# or
git reset --hard origin/master  # Nuclear option
```

## Communication Channels

Since agents can't directly communicate:
1. **CLAUDE.md** - Primary status board
2. **Commit messages** - Detailed change descriptions
3. **Code comments** - `// TODO: Agent 2 - handle edge case`
4. **This document** - Protocol updates

## Task Dependencies

```
Task 1.1 (Rate Limiting) ─── COMPLETE
         │
         v
Task 1.2 (Authentication) ─── IN PROGRESS
         │
         v
Task 2.x (Depends on 1.2)
```

Mark dependencies in IMPLEMENTATION-TASKS.md so agents know the order.
