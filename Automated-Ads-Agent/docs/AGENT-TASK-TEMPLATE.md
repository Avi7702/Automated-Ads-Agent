# Agent Task Template - Production Quality Enforcement

Use this template for all implementation tasks. Copy and customize for each task.

---

# Task [X.X]: [Task Name]

## MISSION
[One sentence describing what must be accomplished]

## CONSTRAINTS
- Branch: `claude/task-X.X-[kebab-case-name]`
- Time limit: [X] subtasks, stop and report if blocked
- No changes outside scope without explicit approval
- All code must have tests

---

## PRE-FLIGHT CHECKLIST

Before ANY action, complete these checks:

### 1. Environment Verification
```bash
ACTION: Run these commands
VERIFY: `git status && git branch --show-current && npm test 2>&1 | tail -5`

EXPECTED:
- On branch: master OR claude/task-X.X-*
- Working tree clean OR only expected changes
- Tests passing (X passed, 0 failed)

PROOF: Paste terminal output
GATE: Cannot proceed until all green
```

### 2. Read Required Files
```bash
ACTION: Read project rules and task spec
COMMANDS:
- Read CLAUDE.md
- Read docs/IMPLEMENTATION-TASKS.md
- Read docs/MULTI-AGENT-WORKFLOW.md

EXPECTED: Understand full requirements before coding
GATE: If requirements unclear, use AskUserQuestion tool
```

### 3. Create Task Branch
```bash
ACTION: Create and checkout task branch
VERIFY: `git checkout -b claude/task-X.X-[name] && git branch --show-current`

EXPECTED OUTPUT:
Switched to a new branch 'claude/task-X.X-[name]'
claude/task-X.X-[name]

PROOF: Paste terminal output
GATE: Must be on correct branch to proceed
```

---

## SUBTASK 1: [First Subtask Name]

### 1.1 Write Tests First (TDD)

```markdown
ACTION: Create test file with X tests for [functionality]

FILE: `server/__tests__/[name].test.ts`

TESTS TO WRITE:
1. "[describe] › should [expected behavior 1]"
2. "[describe] › should [expected behavior 2]"
3. "[describe] › should [expected behavior 3]"
4. "[describe] › should [expected behavior 4]"
5. "[describe] › should [expected behavior 5]"

VERIFY COMMAND:
```bash
npm test -- --testPathPattern="[name]" 2>&1
```

EXPECTED OUTPUT (tests should FAIL at this point):
- "5 failed" or similar (tests exist but implementation missing)
- Test names visible in output

PROOF: Paste full terminal output showing tests exist and fail

REJECTION CRITERIA:
- "0 tests" = REJECTED (no tests written)
- "5 passed" = REJECTED (tests must fail before implementation)
- No output = REJECTED
```

### 1.2 Implement Functionality

```markdown
ACTION: Implement [functionality] to make tests pass

FILE: `server/[path]/[name].ts`

IMPLEMENTATION REQUIREMENTS:
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

CODE PATTERNS TO FOLLOW:
- Check existing files in same directory for patterns
- Use TypeScript strict mode
- No console.log in production code
- Handle errors explicitly

VERIFY COMMAND:
```bash
npm test -- --testPathPattern="[name]" 2>&1
```

EXPECTED OUTPUT:
- "5 passed" (or X passed matching test count)
- "0 failed"
- No TypeScript errors

PROOF: Paste full terminal output

REJECTION CRITERIA:
- Any test failing = REJECTED
- TypeScript errors = REJECTED
- console.log in code = REJECTED
```

### 1.3 Checkpoint

```markdown
ACTION: Commit subtask progress

VERIFY COMMANDS:
```bash
git add server/
git diff --cached --stat
git commit -m "checkpoint: [subtask description] (Task X.X)"
```

EXPECTED:
- Files staged: [expected file list]
- Commit succeeds

PROOF: Paste commit hash and files changed

GATE: Checkpoint must succeed before Subtask 2
```

---

## SUBTASK 2: [Second Subtask Name]

[Repeat same structure: Tests → Implementation → Checkpoint]

---

## SUBTASK 3: [Third Subtask Name]

[Repeat same structure]

---

## INTEGRATION VERIFICATION

After all subtasks complete:

### Full Test Suite
```markdown
ACTION: Run complete test suite

VERIFY COMMAND:
```bash
npm test 2>&1
```

EXPECTED OUTPUT:
- "Test Suites: X passed, X total"
- "Tests: Y passed, Y total"
- "0 failed"
- Exit code 0

PROOF: Paste full test output

REJECTION: Any failure = must fix before proceeding
```

### Manual Verification (if applicable)
```markdown
ACTION: Test functionality manually

VERIFY STEPS:
1. Start server: `npm run dev`
2. Test endpoint: `curl -X POST http://localhost:3000/api/[endpoint] -d '{"key":"value"}'`
3. Verify response matches spec

EXPECTED: [Expected response]

PROOF: Paste curl output
```

---

## FINAL COMMIT & PUSH

```markdown
ACTION: Commit all changes and push

VERIFY COMMANDS:
```bash
git status
git add .
git commit -m "feat: [description] (Task X.X)

- [Change 1]
- [Change 2]
- [Change 3]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push -u origin claude/task-X.X-[name]
```

EXPECTED:
- Commit succeeds
- Push succeeds
- Remote branch created

PROOF: Paste push output with remote URL

GATE: Task incomplete until push succeeds
```

---

## POST-TASK CHECKLIST

```markdown
ACTION: Update project documentation

FILES TO UPDATE:
1. CLAUDE.md - Update task status table
2. docs/IMPLEMENTATION-TASKS.md - Mark task complete
3. Add handoff notes for next agent

VERIFY: Re-read CLAUDE.md and confirm task marked complete

PROOF: Show updated task status table
```

---

## ROLLBACK PROCEDURE

If any step fails and cannot be fixed:

```markdown
STEP 1: Show what broke
`git diff`
`npm test 2>&1 | tail -20`

STEP 2: Attempt fix (max 2 retries)
- Read error message carefully
- Check similar working code for patterns
- Fix and re-run VERIFY command

STEP 3: If still failing after 2 retries
- Revert to last checkpoint: `git checkout -- .`
- Report blocker to user with:
  - What was attempted
  - Exact error message
  - What help is needed

NEVER:
- Push broken code
- Skip failing tests
- Proceed without proof
```

---

## COMPLETION CRITERIA

Task is ONLY complete when ALL are true:
- [ ] All subtask checkpoints committed
- [ ] Full test suite passes (0 failures)
- [ ] Code pushed to remote branch
- [ ] CLAUDE.md task status updated
- [ ] Handoff notes written

---

# Template Usage Example

To use this template:

1. Copy this file
2. Replace all `[X.X]` with task number
3. Replace all `[placeholders]` with specific values
4. Define exact test names
5. Define exact expected output patterns
6. Give to agent with: "Follow this task spec exactly. Provide proof at each GATE."
