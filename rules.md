# Combined Development Rules (73 Total)

## From Our Research: Claude 4.x Optimization (38 rules)

### Category 1: Structure & Format (4 rules)

1. Use XML tags, NOT JSON or Markdown headers
2. Put context/documents at TOP (30% quality boost)
3. Use explicit labels (`<role>`, `<context>`, `<task>`, `<tools_guidance>`, `<output>`, `<stop_conditions>`)
4. Avoid JSON-heavy prompts

### Category 2: Extended Thinking (4 rules)

5. Include `<thinking>` blocks for complex tasks
6. Set thinking budgets: 4K (simple), 16K (medium), 32K (complex)
7. Use adaptive thinking for Opus 4.6 (automatic budget)
8. Encourage interleaved thinking (think between tool calls)

### Category 3: Long Context (4 rules)

9. Leverage 200K-1M context window fully
10. Place important documents in top 30% of prompt
11. Include full files, not snippets
12. Structure multi-document prompts with XML

### Category 4: Tool Use Guidance (3 rules)

13. Provide explicit tool guidance (Read -> Think -> Edit sequence)
14. Specify parallel vs sequential tool calls
15. Use `strict: true` for production agents (if applicable)

### Category 5: Task-Specific Structure (6 rules)

16. Bug fix: Constraints + minimal scope + TDD
17. Feature: Scope boundaries + anti-abstraction warnings
18. Test: Behavior-focused + anti-hard-coding warnings
19. Code Review: Multi-criteria + structured feedback
20. Refactor: Incremental steps + no behavior changes
21. Infrastructure: Safety protocol + rollback plans

### Category 6: Instructions Clarity (4 rules)

22. Be extremely explicit (Claude 4.x is very literal)
23. Provide 3-5 examples for complex tasks
24. Use numbered requirements (not bullets)
25. Specify explicit output format (file paths, structure)

### Category 7: Context Injection (5 rules)

26. Include full tech stack details
27. Include project conventions (CLAUDE.md)
28. Include recent changes (git log)
29. Include specific file paths
30. Include full error messages/stack traces

### Category 8: Anti-Patterns (8 rules)

31. AVOID: JSON-heavy prompts (use XML)
32. AVOID: Short prompts (underutilizes context window)
33. NEVER: Skip thinking blocks
34. AVOID: Vague instructions
35. NEVER: Place context at bottom
36. AVOID: Generic tool instructions
37. ALWAYS: Include stop conditions
38. AVOID: Over-filtering context

---

## From Agent Manus: Team Orchestration (12 rules)

### Category 9: Project Architecture (5 rules)

39. Reference CLAUDE.md for universal project context
40. Create Skills for reusable workflows
41. Define Subagent blueprints for common roles
42. Use Hooks for automated governance
43. Layer prompts (don't put everything in spawn prompt)

### Category 10: Team Coordination (5 rules)

44. Create SCOPE.md for file ownership (prevent conflicts)
45. Use Task List for workflow dependencies
46. Use Inbox for agent-to-agent messaging
47. Partition context per agent (avoid LLM degradation)
48. Assign 5-6 tasks per teammate (optimal sizing)

### Category 11: Advanced Patterns (2 rules)

49. Apply adversarial debugging (parallel hypotheses)
50. Apply multi-lens code review (parallel criteria)

---

## Spec-Driven Development (23 rules)

### Category 12: Spec-Driven Development (8 rules)

51. No code until SPEC.md exists and is approved
52. Every acceptance criterion must be verifiable (testable)
53. Every edge case must have a corresponding BDD test scenario
54. Constraints are separate from acceptance criteria (constraints = hard limits, criteria = behaviors)
55. Spec Interviewer must explore codebase BEFORE interviewing user
56. Implementer must follow TDD (tests first, then code)
57. Verifier has fresh context -- never reuses implementer's session
58. Verification has 3 layers: deterministic (tests) -> agentic (AI review) -> human (manual check)

### Category 13: Agent Architecture (6 rules)

59. Interviewer has `memory: project` -- remembers patterns across sessions
60. Implementer has NO memory -- clean context prevents carry-over bias
61. Verifier has NO Write/Edit tools -- separation of concerns
62. Implementer reports at 6 named checkpoints (SPEC READ -> PLAN -> TESTS -> CORE -> INTEGRATION -> VERIFICATION)
63. Escalation triggers: ambiguous spec, tests fail 3x, new deps, files outside scope
64. Use YAML frontmatter in .claude/agents/ for custom agents

### Category 14: Teammate Scoping (5 rules)

65. ALL context goes IN the spawn prompt -- teammates don't explore external files
66. Every spawn prompt includes Communication Protocol block (mandatory)
67. Every spawn prompt specifies OUTPUT file path
68. Teammates are implementers, NOT orchestrators -- no further delegation
69. Never add `additionalDirectories` as workaround for incomplete prompts

### Category 15: Workflow Integration (4 rules)

70. After implementing -> always run code-reviewer agent
71. Auth/API/PII code -> run security-reviewer agent
72. Build fails -> immediately run build-error-resolver agent
73. SDLC state machine: INTENT -> SPEC -> PLAN -> IMPLEMENT -> VERIFY -> REVIEW -> RELEASE

---

## Quick Reference Card

### Essential Prompt Rules (Must-Have):

- XML structure (Rule 1)
- Context at top (Rule 2)
- Thinking blocks (Rule 5)
- Long context (Rules 9-12)
- Tool guidance (Rule 13)
- Stop conditions (Rule 37)
- CLAUDE.md reference (Rule 39)

### SDD Pipeline Rules (Must-Have):

- Spec before code (Rule 51)
- Testable criteria (Rule 52)
- TDD always (Rule 56)
- Fresh verifier context (Rule 57)
- 3-layer verification (Rule 58)
- Named checkpoints (Rule 62)

### Teammate Spawn Rules (Must-Have):

- Full context in prompt (Rule 65)
- Communication Protocol block (Rule 66)
- OUTPUT file path (Rule 67)
- No further delegation (Rule 68)

### Task-Specific Checklist:

**Bug Fix:**

- Minimal scope constraint
- TDD approach (test first)
- Root cause thinking
- Regression checks

**Feature:**

- SPEC.md exists and is approved (Rule 51)
- TDD approach (test first, Rule 56)
- Anti-over-engineering warnings
- 80%+ coverage requirement
- Code review after (Rule 70)

**Code Review:**

- Multi-criteria (security, performance, testing, quality, maintainability)
- Structured feedback (XML)
- Severity levels
- Highlight good practices too

**Test:**

- Behavior-focused (not implementation)
- 80%+ coverage target
- Edge cases from spec (Rule 53)
- No hard-coded assertions

---

## Compliance Checklist

Before sending a prompt, verify:

### Prompt Quality

- [ ] Uses XML structure (not Markdown)
- [ ] Has `<thinking>` block with budget
- [ ] Context placed at top (documents first)
- [ ] Includes full files (not snippets)
- [ ] Has explicit tool guidance (Read->Think->Edit)
- [ ] Specifies exact output file paths
- [ ] Includes stop conditions
- [ ] References CLAUDE.md
- [ ] Task-specific structure applied
- [ ] Total size: 10K-50K tokens (leverage long context)

### SDD Workflow

- [ ] SPEC.md written and approved before implementation
- [ ] All acceptance criteria are testable
- [ ] Edge cases have BDD scenarios
- [ ] Implementer uses TDD (tests written first)
- [ ] Verifier runs in fresh context (not implementer's session)
- [ ] 3-layer verification applied (deterministic -> agentic -> human)

### Teammate Spawning

- [ ] Spawn prompt contains ALL necessary context
- [ ] Communication Protocol block included verbatim
- [ ] OUTPUT file path specified
- [ ] Teammate scoped as implementer only (no delegation)
- [ ] Escalation triggers defined
