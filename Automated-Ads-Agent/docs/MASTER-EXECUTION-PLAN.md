# Master Execution Plan - Automated Ads Agent

## Project Status Assessment

### COMPLETED
| Task | Status | Tests | Branch |
|------|--------|-------|--------|
| 1.1 Rate Limiting | ✅ DONE | 8 passing | `claude/task-1.1-rate-limiting` |
| 1.2 Authentication | ✅ DONE | 26+ passing | merged |

### NOT IMPLEMENTED
The following features from the planning documents are NOT yet built:

**From Multi-Turn Editing Plan:**
- Database columns: `conversation_history`, `parent_generation_id`, `edit_prompt`
- Edit endpoint: `POST /api/generations/:id/edit`
- History endpoint: `GET /api/generations/:id/history`
- Frontend Edit UI with quick presets

**From World-Class Platform Plan:**
- Prompt templates & builder
- Brand kit integration
- Multi-variation generation
- Platform-specific sizing
- Batch processing
- Analytics & A/B testing
- Alt text & caption generation

---

## Phase Breakdown

### Phase 2: Core Image Generation (4 Tasks)
Foundation for image generation with Gemini integration.

### Phase 3: Multi-Turn Editing (4 Tasks)
Enable iterative image editing with thought signatures.

### Phase 4: Platform Optimization (3 Tasks)
Auto-sizing and platform-specific exports.

### Phase 5: Workflow Features (3 Tasks)
Templates, batch processing, projects.

### Phase 6: Advanced Features (3 Tasks)
Analytics, A/B testing, AI extras.

---

## Phase 2: Core Image Generation

### Task 2.1: Input Validation with Zod
**Priority:** HIGH | **Dependencies:** None | **Effort:** Small

Add Zod validation to all API endpoints.

**Deliverables:**
- `server/validation/schemas.ts` - Zod schemas
- `server/middleware/validate.ts` - Validation middleware
- Apply to all routes in `routes.ts`
- 17+ tests

**Acceptance Criteria:**
- All endpoints validate input before processing
- Invalid input returns 400 with field-level errors
- No unvalidated user input reaches business logic

---

### Task 2.2: Gemini API Integration
**Priority:** HIGH | **Dependencies:** 2.1 | **Effort:** Medium

Integrate Gemini 3 Pro Image for generation.

**Deliverables:**
- `server/services/geminiService.ts` - API wrapper
- `server/__tests__/geminiService.test.ts` - Unit tests
- Environment variable: `GEMINI_API_KEY`
- Error handling for API failures

**Acceptance Criteria:**
- Can call Gemini API with prompt
- Returns base64 image data
- Handles rate limits and errors gracefully
- Stores conversation history for thought signatures

---

### Task 2.3: Image Storage Service
**Priority:** HIGH | **Dependencies:** 2.2 | **Effort:** Medium

Store generated images and metadata.

**Deliverables:**
- `server/services/imageStorage.ts` - Save/retrieve images
- Update `shared/schema.ts` - Add columns to generations table
- Local file storage (upgradeable to S3 later)
- Image URL generation

**Schema Changes:**
```sql
ALTER TABLE generations ADD COLUMN image_path TEXT;
ALTER TABLE generations ADD COLUMN conversation_history JSONB;
ALTER TABLE generations ADD COLUMN model VARCHAR(100);
ALTER TABLE generations ADD COLUMN aspect_ratio VARCHAR(20);
```

**Acceptance Criteria:**
- Images saved to disk with unique filenames
- Metadata stored in database
- Conversation history preserved for editing
- Images retrievable via URL

---

### Task 2.4: Generate Endpoint
**Priority:** HIGH | **Dependencies:** 2.2, 2.3 | **Effort:** Medium

Complete `POST /api/transform` endpoint.

**Deliverables:**
- Implement full generation flow in routes.ts
- Accept prompt, reference images, aspect ratio
- Return generation ID and image URL
- Store conversation history for editing

**Request:**
```json
{
  "prompt": "Professional product photo of steel bars",
  "referenceImages": ["base64..."],
  "aspectRatio": "1:1"
}
```

**Response:**
```json
{
  "success": true,
  "generationId": "uuid",
  "imageUrl": "/uploads/generation_123.png",
  "canEdit": true
}
```

**Acceptance Criteria:**
- Full e2e generation works
- Conversation history stored
- Tests pass (mock Gemini API)

---

## Phase 3: Multi-Turn Editing

### Task 3.1: Edit Schema Updates
**Priority:** HIGH | **Dependencies:** 2.3 | **Effort:** Small

Add edit-related columns to generations table.

**Schema Changes:**
```sql
ALTER TABLE generations ADD COLUMN parent_generation_id UUID REFERENCES generations(id);
ALTER TABLE generations ADD COLUMN edit_prompt TEXT;
ALTER TABLE generations ADD COLUMN edit_count INTEGER DEFAULT 0;
```

**Deliverables:**
- Updated `shared/schema.ts`
- Migration script
- Updated storage methods

---

### Task 3.2: Edit Endpoint
**Priority:** HIGH | **Dependencies:** 3.1 | **Effort:** Medium

`POST /api/generations/:id/edit` endpoint.

**Deliverables:**
- Load parent generation's conversation history
- Append edit prompt to history
- Call Gemini with full history (preserves thought signatures)
- Create new generation linked to parent
- 10+ tests

**Request:**
```json
{
  "editPrompt": "Make the lighting warmer"
}
```

**Response:**
```json
{
  "success": true,
  "generationId": "new-uuid",
  "imageUrl": "/uploads/generation_456.png",
  "parentId": "parent-uuid",
  "canEdit": true
}
```

---

### Task 3.3: History Endpoint
**Priority:** MEDIUM | **Dependencies:** 3.2 | **Effort:** Small

`GET /api/generations/:id/history` endpoint.

**Deliverables:**
- Walk parent chain to build edit history
- Return array of generations with edit prompts
- Tests

---

### Task 3.4: Frontend Edit UI
**Priority:** HIGH | **Dependencies:** 3.2 | **Effort:** Medium

Edit panel in GenerationDetail component.

**Deliverables:**
- Edit button opens edit panel
- Quick edit presets (lighting, composition, style)
- Custom edit text input
- Loading state during edit
- Navigate to new generation on success
- Show edit lineage ("Edited from...")

---

## Phase 4: Platform Optimization

### Task 4.1: Platform Presets
**Priority:** MEDIUM | **Dependencies:** 2.4 | **Effort:** Small

Platform-specific aspect ratios and sizes.

**Deliverables:**
- `server/config/platformSpecs.ts` - All platform sizes
- Aspect ratio selector in frontend
- Map to Gemini aspect ratio values

---

### Task 4.2: Image Resize Service
**Priority:** MEDIUM | **Dependencies:** 4.1 | **Effort:** Medium

Resize images for different platforms.

**Deliverables:**
- `server/services/imageResize.ts` - Sharp-based resizing
- Smart crop with focal point detection
- Batch resize to multiple platforms

---

### Task 4.3: Export Endpoint
**Priority:** MEDIUM | **Dependencies:** 4.2 | **Effort:** Small

`POST /api/generations/:id/export` endpoint.

**Deliverables:**
- Export to multiple platform sizes
- Return zip or individual URLs

---

## Phase 5: Workflow Features

### Task 5.1: Prompt Templates
**Priority:** MEDIUM | **Dependencies:** 2.4 | **Effort:** Medium

Template system for consistent prompts.

**Deliverables:**
- `prompt_templates` table
- CRUD endpoints for templates
- Variable substitution system
- 10+ preset templates

---

### Task 5.2: Projects Organization
**Priority:** LOW | **Dependencies:** 2.4 | **Effort:** Medium

Group generations into projects.

**Deliverables:**
- `projects` table
- Project CRUD endpoints
- Assign generations to projects

---

### Task 5.3: Batch Generation
**Priority:** LOW | **Dependencies:** 5.1 | **Effort:** Large

Generate multiple images from templates.

**Deliverables:**
- Batch generation queue
- Progress tracking
- CSV import for variables

---

## Phase 6: Advanced Features

### Task 6.1: Generation Analytics
**Priority:** LOW | **Dependencies:** 2.4 | **Effort:** Medium

Track generation performance.

**Deliverables:**
- `generation_analytics` table
- Track views, downloads, ratings
- Analytics dashboard

---

### Task 6.2: A/B Testing Framework
**Priority:** LOW | **Dependencies:** 6.1 | **Effort:** Large

Test different prompt variations.

**Deliverables:**
- `ab_tests` table
- Generate variants automatically
- Track winner based on metrics

---

### Task 6.3: AI Extras
**Priority:** LOW | **Dependencies:** 2.4 | **Effort:** Medium

Alt text and caption generation.

**Deliverables:**
- Alt text endpoint
- Caption suggestions endpoint
- Integrate with Gemini text model

---

## Agent Assignment Strategy

### Recommended: 3 Parallel Agents

**Agent A: Backend Core**
- Task 2.1 → 2.2 → 2.3 → 2.4
- Task 3.1 → 3.2 → 3.3

**Agent B: Frontend & UI**
- Task 3.4 (after 3.2 complete)
- Task 4.1 (platform selector UI)

**Agent C: Infrastructure**
- Task 4.2 → 4.3
- Task 5.1

### Sequential Dependency Chain
```
2.1 ─→ 2.2 ─→ 2.3 ─→ 2.4 ─→ 3.1 ─→ 3.2 ─→ 3.3
                           ↘
                            3.4 (Frontend)
```

---

## Enforcement Rules for All Agents

### Every Agent MUST:

1. **Read before coding:**
   - `CLAUDE.md` - Project rules
   - `docs/IMPLEMENTATION-TASKS.md` - Task specs
   - `docs/AGENT-TASK-TEMPLATE.md` - Execution template

2. **Use strict task spec:**
   - Copy `docs/AGENT-TASK-TEMPLATE.md`
   - Fill in all VERIFY commands
   - Define exact expected outputs

3. **Follow TDD:**
   - Write tests FIRST (must fail)
   - Implement code
   - Verify tests pass
   - Checkpoint commit

4. **Provide proof at every GATE:**
   - Paste actual terminal output
   - No summaries, no screenshots
   - Must match expected pattern

5. **Commit frequently:**
   - Checkpoint after each subtask
   - Clear commit messages
   - Never push broken code

6. **Update documentation:**
   - Mark task complete in CLAUDE.md
   - Add handoff notes
   - Update this file

### Rejection Criteria (Auto-Fail):
- Code without tests = REJECTED
- "Tests pass" without output = REJECTED
- Skipping GATE verification = REJECTED
- Pushing to main without review = REJECTED
- Breaking existing tests = REJECTED

---

## Priority Order for Next Session

1. **Task 2.1: Input Validation** (unblocks everything)
2. **Task 2.2: Gemini Integration** (core feature)
3. **Task 2.3: Image Storage** (required for generation)
4. **Task 2.4: Generate Endpoint** (MVP feature)
5. **Task 3.1-3.2: Edit Feature** (key differentiator)

---

## Success Metrics

### MVP Complete When:
- [ ] User can generate images from prompts
- [ ] Conversation history stored (thought signatures)
- [ ] User can edit images with natural language
- [ ] Edit chain preserved (version history)
- [ ] All tests pass (50+ tests)
- [ ] No security vulnerabilities

### Production Ready When:
- [ ] Rate limiting active
- [ ] Authentication enforced
- [ ] Input validation on all endpoints
- [ ] Error monitoring configured
- [ ] Database migrations documented
- [ ] Deployment guide written

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-XX-XX | Claude | Initial plan |
