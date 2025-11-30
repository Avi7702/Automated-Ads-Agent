# Agent Task Template v2 - Strict Verification

## Core Principle

Every subtask follows: **DO → VERIFY → EXPECTED → PROVE → GATE**

Agent CANNOT:
- Say "done" without proof
- Provide fake proof (must match expected pattern)
- Skip ahead (gated)
- Interpret loosely (exact commands given)

---

# Task [X.X]: [Task Name]

## MISSION
[One sentence describing what must be accomplished]

## CONSTRAINTS
- Branch: `claude/task-X.X-[kebab-case-name]`
- All code must have tests
- No shortcuts, no summaries

---

## PRE-FLIGHT

### PF-1: Environment Check

```
ACTION: Verify clean environment

VERIFY: Run this exact command:
npm test 2>&1 | tail -10

EXPECTED OUTPUT MUST CONTAIN:
- "Test Suites:" followed by "passed"
- "0 failed" or no "failed" count
- Exit without error

PROOF: Paste the 10 lines of output here

REJECTION CRITERIA:
- "failed" appears with count > 0 = REJECTED
- Command error = REJECTED
- No output = REJECTED

GATE: Cannot proceed until baseline tests pass
```

### PF-2: Create Branch

```
ACTION: Create and switch to task branch

VERIFY: Run this exact command:
git checkout -b claude/task-X.X-[name] 2>&1 && git branch --show-current

EXPECTED OUTPUT:
Switched to a new branch 'claude/task-X.X-[name]'
claude/task-X.X-[name]

PROOF: Paste both lines

REJECTION CRITERIA:
- Branch name doesn't match = REJECTED
- Error message = REJECTED

GATE: Must be on correct branch
```

---

## SUBTASK 1: [Name]

### ST-1.1: Write Tests First

```
ACTION: Create tests in [file path]

TESTS TO CREATE (exact names):
1. "[describe] › [test name 1]"
2. "[describe] › [test name 2]"
3. "[describe] › [test name 3]"
4. "[describe] › [test name 4]"
5. "[describe] › [test name 5]"

VERIFY: Run this exact command:
npm test -- --testPathPattern="[pattern]" 2>&1 | grep -E "(PASS|FAIL|✓|✕|Tests:)"

EXPECTED OUTPUT AT THIS STAGE:
Tests should FAIL because implementation doesn't exist yet.
Must see:
- Test file found
- 5 test names visible
- "failed" or "✕" for each test

PROOF: Paste grep output showing 5 failing tests

REJECTION CRITERIA:
- "0 tests" = REJECTED (no tests written)
- "5 passed" = REJECTED (tests must fail first)
- Tests names don't match list above = REJECTED

GATE: Tests must exist and fail before implementation
```

### ST-1.2: Implement Function

```
ACTION: Implement [function name] in [file path]

REQUIREMENTS:
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

VERIFY: Run this exact command:
npm test -- --testPathPattern="[pattern]" 2>&1 | grep -E "(PASS|FAIL|✓|✕|Tests:)"

EXPECTED OUTPUT:
- "PASS" or all "✓"
- "5 passed"
- "0 failed"

PROOF: Paste grep output showing 5 passing tests

REJECTION CRITERIA:
- Any "✕" or "failed" = REJECTED
- Fewer than 5 passed = REJECTED
- TypeScript errors = REJECTED

GATE: All 5 tests must pass
```

### ST-1.3: Checkpoint Commit

```
ACTION: Stage and commit subtask work

VERIFY: Run these exact commands:
git add [files]
git diff --cached --stat
git commit -m "checkpoint: [description]"

EXPECTED OUTPUT:
- Files staged (shows insertions/deletions)
- Commit hash returned (7+ characters)

PROOF: Paste git output showing commit hash

REJECTION CRITERIA:
- "nothing to commit" = REJECTED
- Commit failed = REJECTED

GATE: Checkpoint must succeed before next subtask
```

---

## SUBTASK 2: [Name]

[Repeat ST-2.1, ST-2.2, ST-2.3 with same structure]

---

## INTEGRATION VERIFICATION

### IV-1: Full Test Suite

```
ACTION: Run complete test suite

VERIFY: Run this exact command:
npm test 2>&1 | tail -20

EXPECTED OUTPUT MUST CONTAIN:
- "Test Suites: X passed, 0 failed"
- "Tests: Y passed, 0 failed"
- All test file names visible
- No errors

PROOF: Paste last 20 lines of test output

REJECTION CRITERIA:
- Any "failed" count > 0 = REJECTED
- Missing test files = REJECTED
- TypeScript errors = REJECTED

GATE: Full suite must pass
```

---

## FINAL COMMIT & PUSH

### FC-1: Final Commit

```
ACTION: Commit all remaining changes

VERIFY: Run this exact command:
git status && git add . && git commit -m "feat: [description] (Task X.X)" 2>&1

EXPECTED OUTPUT:
- Shows files changed
- Commit hash returned
- No errors

PROOF: Paste git output

GATE: Commit must succeed
```

### FC-2: Push to Remote

```
ACTION: Push branch to remote

VERIFY: Run this exact command:
git push -u origin claude/task-X.X-[name] 2>&1

EXPECTED OUTPUT MUST CONTAIN:
- "Branch 'claude/task-X.X-[name]' set up to track"
- Remote URL visible
- No errors

PROOF: Paste push output

REJECTION CRITERIA:
- Push failed = REJECTED
- Wrong branch name = REJECTED

GATE: Task incomplete until push succeeds
```

---

## POST-TASK UPDATE

### PT-1: Update CLAUDE.md

```
ACTION: Update task status table in CLAUDE.md

CHANGES:
| X.X [Task Name] | Complete | claude/task-X.X-[name] |

VERIFY: Run this exact command:
grep "X.X" CLAUDE.md

EXPECTED OUTPUT:
Shows task row with "Complete" status

PROOF: Paste grep output

GATE: Documentation must be updated
```

---

## ROLLBACK PROCEDURE

If any GATE fails after 2 fix attempts:

```
STEP 1: Show current state
git status
git diff
npm test 2>&1 | tail -10

STEP 2: Report blocker
- What GATE failed
- Exact error message
- What was attempted
- Paste all relevant output

STEP 3: DO NOT proceed
Wait for user guidance

NEVER:
- Push broken code
- Skip failing GATEs
- Proceed without proof
```

---

## Verification Checklist (All Required)

Before marking task complete, ALL must be true:

- [ ] PF-1: Baseline tests passed ✓
- [ ] PF-2: On correct branch ✓
- [ ] ST-X.1: Tests written and failing ✓
- [ ] ST-X.2: Implementation passes tests ✓
- [ ] ST-X.3: Checkpoint committed ✓
- [ ] IV-1: Full test suite passes ✓
- [ ] FC-1: Final commit done ✓
- [ ] FC-2: Pushed to remote ✓
- [ ] PT-1: CLAUDE.md updated ✓

Each checkbox requires PROOF pasted.
