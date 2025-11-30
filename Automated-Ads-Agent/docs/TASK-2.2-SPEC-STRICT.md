# Task 2.2: Gemini API Integration - STRICT SPEC

## MISSION
Integrate Google Gemini 2.0 Flash for image generation with conversation history support for thought signatures.

## CONSTRAINTS
- Branch: `claude/task-2.2-gemini-integration`
- Must write tests FIRST (TDD)
- All proofs required at each GATE
- Mock Gemini API in tests (don't call real API)

---

## PRE-FLIGHT

### PF-1: Environment Check

```
ACTION: Verify baseline tests pass

VERIFY: Run this exact command:
npm test 2>&1 | tail -15

EXPECTED OUTPUT MUST CONTAIN:
- "Test Suites:" with "passed"
- "0 failed" or no failed count
- Clean exit (no npm ERR!)

PROOF: Paste the 15 lines here:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any "failed" with count > 0 = REJECTED
- "npm ERR!" = REJECTED
- Empty output = REJECTED

GATE: Cannot proceed until baseline green
```

### PF-2: Create Branch

```
ACTION: Create task branch

VERIFY: Run this exact command:
git checkout -b claude/task-2.2-gemini-integration 2>&1 && git branch --show-current

EXPECTED OUTPUT (exactly):
Switched to a new branch 'claude/task-2.2-gemini-integration'
claude/task-2.2-gemini-integration

PROOF: Paste both lines:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Different branch name = REJECTED
- Error message = REJECTED
- Only one line = REJECTED

GATE: Must show exact branch name
```

### PF-3: Check for GEMINI_API_KEY

```
ACTION: Verify environment variable setup

VERIFY: Check .env.example exists and has GEMINI_API_KEY:
grep -n "GEMINI" .env.example 2>&1 || echo "Not found"

If not found, add it:
echo "GEMINI_API_KEY=your_gemini_api_key_here" >> .env.example

PROOF: Paste grep output showing GEMINI_API_KEY line
[AGENT PASTES OUTPUT HERE]

GATE: .env.example must have GEMINI_API_KEY
```

---

## SUBTASK 1: Gemini Service Tests

### ST-1.1: Write Service Tests

```
ACTION: Create file server/__tests__/geminiService.test.ts with these exact tests

TESTS TO CREATE (use these exact describe/it names):
1. "GeminiService › generateImage › calls Gemini API with prompt"
2. "GeminiService › generateImage › returns base64 image data"
3. "GeminiService › generateImage › stores conversation history"
4. "GeminiService › generateImage › handles API errors gracefully"
5. "GeminiService › generateImage › includes reference images when provided"
6. "GeminiService › generateImage › respects aspect ratio parameter"
7. "GeminiService › continueConversation › appends to existing history"
8. "GeminiService › continueConversation › maintains thought signatures"
9. "GeminiService › config › throws if GEMINI_API_KEY not set"
10. "GeminiService › config › uses correct model version"

VERIFY: Run this exact command:
npm test -- --testPathPattern="geminiService" 2>&1 | grep -E "(PASS|FAIL|✓|✕|geminiService)" | head -20

EXPECTED OUTPUT AT THIS STAGE:
- File "geminiService.test.ts" appears
- Tests FAIL (service doesn't exist)
- Shows ~10 failing tests

PROOF: Paste the grep output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- "Cannot find module" for test file = REJECTED (file not created)
- "0 tests" = REJECTED
- Tests passing = REJECTED (must fail first!)
- Fewer than 10 tests = REJECTED

GATE: Must see 10 failing tests before implementing service
```

### ST-1.2: Implement Gemini Service

```
ACTION: Create file server/services/geminiService.ts

IMPLEMENTATION REQUIREMENTS:
1. Import GoogleGenerativeAI from @google/generative-ai
2. Validate GEMINI_API_KEY exists on init
3. Use model: "gemini-2.0-flash-exp" (or latest image model)
4. Function: generateImage(prompt, options?)
   - options: { referenceImages?: string[], aspectRatio?: string }
   - Returns: { imageBase64: string, conversationHistory: Message[] }
5. Function: continueConversation(history, editPrompt)
   - Appends edit to history
   - Calls Gemini with full history (preserves thought signatures)
   - Returns same structure as generateImage
6. Export types: GenerateResult, ConversationMessage

SKELETON:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ConversationMessage {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}

export interface GenerateResult {
  imageBase64: string;
  conversationHistory: ConversationMessage[];
  model: string;
}

export interface GenerateOptions {
  referenceImages?: string[];
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

class GeminiService {
  private client: GoogleGenerativeAI;
  private model: string = 'gemini-2.0-flash-exp';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateImage(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    // Implementation here
  }

  async continueConversation(
    history: ConversationMessage[],
    editPrompt: string
  ): Promise<GenerateResult> {
    // Implementation here
  }
}

export const geminiService = new GeminiService();
```

VERIFY: Run this exact command:
npm test -- --testPathPattern="geminiService" 2>&1 | grep -E "(PASS|FAIL|✓|✕|Tests:)" | tail -15

EXPECTED OUTPUT:
- "PASS" for geminiService.test.ts
- "10 passed" or "✓" for each test
- "0 failed"

PROOF: Paste the output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any "✕" = REJECTED
- "failed" count > 0 = REJECTED
- Fewer than 10 passed = REJECTED

GATE: All 10 service tests must pass
```

### ST-1.3: Checkpoint 1

```
ACTION: Commit service work

VERIFY: Run these exact commands in sequence:
git add server/services/geminiService.ts server/__tests__/geminiService.test.ts
git diff --cached --stat
git commit -m "checkpoint: add Gemini service with tests (Task 2.2)"

EXPECTED OUTPUT:
- 2 files changed
- insertions shown
- Commit hash (7+ chars)

PROOF: Paste the full git output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- "nothing to commit" = REJECTED
- Missing files = REJECTED
- No commit hash = REJECTED

GATE: Checkpoint required before Subtask 2
```

---

## SUBTASK 2: Validation Schema for Transform

### ST-2.1: Write Transform Schema Tests

```
ACTION: Add transform schema tests to server/__tests__/validation.test.ts

TESTS TO ADD (exact names):
11. "Validation Schemas › transformSchema › accepts valid transform request"
12. "Validation Schemas › transformSchema › rejects missing prompt"
13. "Validation Schemas › transformSchema › accepts optional referenceImages"
14. "Validation Schemas › transformSchema › validates aspectRatio enum"
15. "Validation Schemas › transformSchema › rejects invalid aspectRatio"

VERIFY: Run this exact command:
npm test -- --testPathPattern="validation" 2>&1 | grep -E "(Tests:)" | tail -5

EXPECTED OUTPUT:
- Previous tests still pass
- 5 new tests FAIL (schema not implemented)

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must see new failing tests
```

### ST-2.2: Implement Transform Schema

```
ACTION: Add transformSchema to server/validation/schemas.ts

SCHEMA:
export const transformSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt too long'),
  referenceImages: z.array(z.string()).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1')
});

export type TransformInput = z.infer<typeof transformSchema>;

VERIFY: Run this exact command:
npm test -- --testPathPattern="validation" 2>&1 | grep -E "(Tests:)"

EXPECTED OUTPUT:
- All validation tests pass
- 0 failed

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: All validation tests must pass
```

### ST-2.3: Checkpoint 2

```
ACTION: Commit schema work

VERIFY: Run:
git add server/validation/schemas.ts server/__tests__/validation.test.ts
git commit -m "checkpoint: add transform validation schema (Task 2.2)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required before Subtask 3
```

---

## SUBTASK 3: Install Dependencies

### ST-3.1: Install Gemini SDK

```
ACTION: Install Google Generative AI package

VERIFY: Run this exact command:
npm install @google/generative-ai 2>&1 | tail -10

EXPECTED OUTPUT:
- "added X packages"
- No errors

VERIFY package.json updated:
grep "@google/generative-ai" package.json

PROOF: Paste both outputs:
[AGENT PASTES OUTPUT HERE]

GATE: Package must be installed
```

### ST-3.2: Checkpoint 3

```
ACTION: Commit dependency changes

VERIFY: Run:
git add package.json package-lock.json
git commit -m "checkpoint: add Gemini SDK dependency (Task 2.2)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Dependency commit required
```

---

## INTEGRATION VERIFICATION

### IV-1: Full Test Suite

```
ACTION: Run complete test suite

VERIFY: Run this exact command:
npm test 2>&1 | grep -E "(Test Suites:|Tests:)"

EXPECTED OUTPUT:
Test Suites: X passed, 0 failed, X total
Tests:       Y passed, 0 failed, Y total

Where Y >= 60 (previous 50 + 10 gemini + 5 transform validation)

PROOF: Paste the two lines:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any "failed" > 0 = REJECTED
- Tests < 60 = REJECTED

GATE: Must have 0 failures
```

### IV-2: Type Check

```
ACTION: Verify TypeScript compiles

VERIFY: Run this exact command:
npx tsc --noEmit 2>&1 | tail -10

EXPECTED OUTPUT:
- No errors (empty output or just warnings)

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- TypeScript errors = REJECTED

GATE: Must compile without errors
```

---

## FINAL COMMIT & PUSH

### FC-1: Final Commit

```
ACTION: Final commit with full message

VERIFY: Run:
git add .
git status
git commit -m "feat: add Gemini API integration for image generation (Task 2.2)

- Add GeminiService with generateImage and continueConversation
- Store conversation history for thought signatures
- Add transformSchema for input validation
- Install @google/generative-ai SDK

Tests: 15 new tests, all passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

EXPECTED OUTPUT:
- Commit hash returned
- No uncommitted files

PROOF: Paste git output:
[AGENT PASTES OUTPUT HERE]

GATE: Commit must succeed
```

### FC-2: Push to Remote

```
ACTION: Push branch

VERIFY: Run:
git push -u origin claude/task-2.2-gemini-integration 2>&1

EXPECTED OUTPUT CONTAINS:
- "set up to track"
- Remote URL
- Branch name visible

PROOF: Paste push output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Push failed = REJECTED
- Auth error = REJECTED

GATE: Task incomplete until pushed
```

---

## POST-TASK UPDATE

### PT-1: Update CLAUDE.md

```
ACTION: Add task to status table

EDIT: Add this row to task table:
| 2.2 Gemini Integration | Complete | claude/task-2.2-gemini-integration |

ADD to Key Files:
- `server/services/geminiService.ts` - Gemini API wrapper (Task 2.2 complete)

VERIFY: Run:
grep "2.2" CLAUDE.md

EXPECTED OUTPUT:
| 2.2 Gemini Integration | Complete | claude/task-2.2-gemini-integration |

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: Documentation required
```

---

## COMPLETION CHECKLIST

All boxes must have PROOF pasted:

- [ ] PF-1: Baseline tests pass
- [ ] PF-2: On branch claude/task-2.2-gemini-integration
- [ ] PF-3: GEMINI_API_KEY in .env.example
- [ ] ST-1.1: 10 service tests failing
- [ ] ST-1.2: 10 service tests passing
- [ ] ST-1.3: Checkpoint 1 committed
- [ ] ST-2.1: 5 validation tests failing
- [ ] ST-2.2: All validation tests passing
- [ ] ST-2.3: Checkpoint 2 committed
- [ ] ST-3.1: Gemini SDK installed
- [ ] ST-3.2: Checkpoint 3 committed
- [ ] IV-1: Full suite 60+ tests, 0 failed
- [ ] IV-2: TypeScript compiles
- [ ] FC-1: Final commit done
- [ ] FC-2: Pushed to remote
- [ ] PT-1: CLAUDE.md updated

**Task 2.2 is ONLY complete when all 16 GATEs have PROOF.**

---

## NOTES FOR TESTING

### Mocking Gemini API

In tests, mock the Gemini client:

```typescript
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/png',
                  data: 'base64encodedimage'
                }
              }]
            }
          }]
        }
      })
    })
  }))
}));
```

### Environment Variable in Tests

```typescript
beforeAll(() => {
  process.env.GEMINI_API_KEY = 'test-api-key';
});
```
