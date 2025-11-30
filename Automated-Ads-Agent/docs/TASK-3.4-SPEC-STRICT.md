# Task 3.4: Frontend Edit UI - STRICT SPEC

## MISSION
Create edit panel in frontend for multi-turn image editing with quick presets.

## CONSTRAINTS
- Branch: `claude/task-3.4-frontend-edit-ui`
- Must write tests FIRST (TDD)
- All proofs required at each GATE
- Depends on: Task 3.2 (Edit Endpoint) must be complete
- This is a FRONTEND task - different testing approach

## SUBAGENT USAGE (Recommended)
You have access to subagents. Use them for:
- **Explore agent**: To find existing React patterns in codebase
- **code-reviewer agent**: After implementing components
- **frontend-design skill**: For UI design guidance (if available)

---

## PRE-FLIGHT

### PF-1: Verify Task 3.2 Complete

```
ACTION: Confirm edit endpoint works

VERIFY: Run:
grep -n "generations/:id/edit" server/routes.ts

EXPECTED OUTPUT:
- Line showing edit endpoint route

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Cannot proceed until 3.2 is done
```

### PF-2: Find Frontend Location

```
ACTION: Locate frontend source files

VERIFY: Run:
ls -la client/src/ 2>&1 || ls -la src/ 2>&1 || ls -la frontend/src/ 2>&1

EXPECTED OUTPUT:
- React source directory found

PROOF: Paste output showing React files:
[AGENT PASTES OUTPUT HERE]

NOTE: Adjust paths in this spec based on actual frontend location

GATE: Must locate frontend
```

### PF-3: Environment Check

```
ACTION: Verify tests pass

VERIFY: Run:
npm test 2>&1 | tail -15

EXPECTED OUTPUT:
- "0 failed"
- 102+ tests passing

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Baseline must be green
```

### PF-4: Create Branch

```
ACTION: Create task branch

VERIFY: Run:
git checkout -b claude/task-3.4-frontend-edit-ui 2>&1 && git branch --show-current

EXPECTED OUTPUT:
Switched to a new branch 'claude/task-3.4-frontend-edit-ui'
claude/task-3.4-frontend-edit-ui

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must show exact branch name
```

---

## SUBTASK 1: Edit Panel Component

### ST-1.1: Create Edit Panel Component

```
ACTION: Create EditPanel component

FILE: client/src/components/EditPanel.tsx (adjust path as needed)

```typescript
import React, { useState } from 'react';

interface EditPanelProps {
  generationId: string;
  onEditComplete: (newGenerationId: string) => void;
  onCancel: () => void;
}

const QUICK_PRESETS = [
  { label: 'Warmer lighting', prompt: 'Make the lighting warmer and more inviting' },
  { label: 'Cooler tones', prompt: 'Adjust to cooler, more professional tones' },
  { label: 'More contrast', prompt: 'Increase the contrast for more dramatic effect' },
  { label: 'Softer look', prompt: 'Make the image softer and more gentle' },
  { label: 'Crop tighter', prompt: 'Crop the image tighter on the main subject' },
  { label: 'Add depth', prompt: 'Add more depth and dimension to the scene' },
];

export function EditPanel({ generationId, onEditComplete, onCancel }: EditPanelProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/generations/${generationId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ editPrompt: prompt }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Edit failed');
      }

      const data = await response.json();
      onEditComplete(data.generationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="edit-panel">
      <h3>Edit Image</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="quick-presets">
        <h4>Quick Edits</h4>
        <div className="preset-buttons">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleSubmit(preset.prompt)}
              disabled={isLoading}
              className="preset-button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="custom-edit">
        <h4>Custom Edit</h4>
        <textarea
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          placeholder="Describe how you want to modify the image..."
          disabled={isLoading}
          rows={3}
        />
        <div className="button-row">
          <button
            onClick={() => handleSubmit(editPrompt)}
            disabled={isLoading || !editPrompt.trim()}
            className="submit-button"
          >
            {isLoading ? 'Editing...' : 'Apply Edit'}
          </button>
          <button onClick={onCancel} disabled={isLoading} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

VERIFY: Run:
ls -la client/src/components/EditPanel.tsx 2>&1

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Component file must exist
```

### ST-1.2: Checkpoint 1

```
ACTION: Commit edit panel component

VERIFY: Run:
git add client/src/components/EditPanel.tsx
git commit -m "checkpoint: add EditPanel component (Task 3.4)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 2: Edit History Component

### ST-2.1: Create History Display Component

```
ACTION: Create EditHistory component

FILE: client/src/components/EditHistory.tsx

```typescript
import React, { useEffect, useState } from 'react';

interface HistoryItem {
  id: string;
  editPrompt: string | null;
  imageUrl: string;
  createdAt: string;
}

interface EditHistoryProps {
  generationId: string;
  onSelectVersion: (id: string) => void;
}

export function EditHistory({ generationId, onSelectVersion }: EditHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/generations/${generationId}/history`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load history');
        }

        const data = await response.json();
        setHistory(data.history);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [generationId]);

  if (isLoading) return <div className="loading">Loading history...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="edit-history">
      <h4>Edit History ({history.length} versions)</h4>
      <div className="history-timeline">
        {history.map((item, index) => (
          <div
            key={item.id}
            className={`history-item ${item.id === generationId ? 'current' : ''}`}
            onClick={() => onSelectVersion(item.id)}
          >
            <img src={item.imageUrl} alt={`Version ${index + 1}`} />
            <div className="history-info">
              <span className="version">v{index + 1}</span>
              {item.editPrompt && (
                <span className="edit-prompt">{item.editPrompt}</span>
              )}
              {!item.editPrompt && <span className="original">Original</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

VERIFY: Run:
ls -la client/src/components/EditHistory.tsx 2>&1

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: History component must exist
```

### ST-2.2: Checkpoint 2

```
ACTION: Commit history component

VERIFY: Run:
git add client/src/components/EditHistory.tsx
git commit -m "checkpoint: add EditHistory component (Task 3.4)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 3: Styles

### ST-3.1: Add Component Styles

```
ACTION: Create CSS for edit components

FILE: client/src/components/EditPanel.css

```css
.edit-panel {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  max-width: 400px;
}

.edit-panel h3 {
  margin: 0 0 1rem 0;
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.quick-presets {
  margin-bottom: 1.5rem;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.preset-button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-button:hover:not(:disabled) {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.preset-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-edit textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
}

.button-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.submit-button {
  flex: 1;
  padding: 0.75rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-button {
  padding: 0.75rem 1rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Edit History Styles */
.edit-history {
  margin-top: 1rem;
}

.history-timeline {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.5rem 0;
}

.history-item {
  flex-shrink: 0;
  width: 100px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
}

.history-item.current {
  border-color: #007bff;
}

.history-item img {
  width: 100%;
  height: 80px;
  object-fit: cover;
}

.history-info {
  padding: 0.25rem;
  font-size: 0.75rem;
  background: #f8f9fa;
}

.history-info .version {
  font-weight: bold;
}

.history-info .edit-prompt {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-info .original {
  color: #6c757d;
  font-style: italic;
}
```

VERIFY: Run:
ls -la client/src/components/EditPanel.css 2>&1

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Styles must exist
```

### ST-3.2: Checkpoint 3

```
ACTION: Commit styles

VERIFY: Run:
git add client/src/components/EditPanel.css
git commit -m "checkpoint: add edit component styles (Task 3.4)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 4: Integration

### ST-4.1: Export Components

```
ACTION: Add exports to components index

FILE: Update client/src/components/index.ts (or create if needed)

```typescript
export { EditPanel } from './EditPanel';
export { EditHistory } from './EditHistory';
```

VERIFY: Run:
grep -E "(EditPanel|EditHistory)" client/src/components/index.ts

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Exports must be added
```

### ST-4.2: Checkpoint 4

```
ACTION: Commit integration

VERIFY: Run:
git add client/src/components/
git commit -m "checkpoint: export edit components (Task 3.4)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## INTEGRATION VERIFICATION

### IV-1: Build Check

```
ACTION: Verify frontend builds

VERIFY: Run:
npm run build 2>&1 | tail -20

EXPECTED OUTPUT:
- Build succeeds without errors

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must build successfully
```

### IV-2: TypeScript Check

```
ACTION: Verify types

VERIFY: Run:
npx tsc --noEmit 2>&1 | tail -10

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: No type errors
```

---

## FINAL COMMIT & PUSH

### FC-1: Final Commit

```
ACTION: Final commit

VERIFY: Run:
git add .
git commit -m "feat: add frontend edit UI components (Task 3.4)

- Add EditPanel component with quick presets
- Add EditHistory component for version timeline
- Add styling for edit components
- Support custom edit prompts

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

PROOF: Paste git output:
[AGENT PASTES OUTPUT HERE]

GATE: Commit must succeed
```

### FC-2: Push to Remote

```
ACTION: Push branch

VERIFY: Run:
git push -u origin claude/task-3.4-frontend-edit-ui 2>&1

PROOF: Paste push output:
[AGENT PASTES OUTPUT HERE]

GATE: Task incomplete until pushed
```

---

## POST-TASK UPDATE

### PT-1: Update CLAUDE.md

```
ACTION: Add task to status table

EDIT: Add this row:
| 3.4 Frontend Edit UI | Complete | claude/task-3.4-frontend-edit-ui |

ADD to Key Files:
- `client/src/components/EditPanel.tsx` - Edit UI (Task 3.4 complete)
- `client/src/components/EditHistory.tsx` - History UI (Task 3.4 complete)

VERIFY: Run:
grep "3.4" CLAUDE.md

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: Documentation required
```

---

## COMPLETION CHECKLIST

- [ ] PF-1: Task 3.2 complete
- [ ] PF-2: Frontend located
- [ ] PF-3: Baseline tests pass
- [ ] PF-4: On correct branch
- [ ] ST-1.1: EditPanel component created
- [ ] ST-1.2: Checkpoint 1 committed
- [ ] ST-2.1: EditHistory component created
- [ ] ST-2.2: Checkpoint 2 committed
- [ ] ST-3.1: Styles added
- [ ] ST-3.2: Checkpoint 3 committed
- [ ] ST-4.1: Components exported
- [ ] ST-4.2: Checkpoint 4 committed
- [ ] IV-1: Frontend builds
- [ ] IV-2: TypeScript compiles
- [ ] FC-1: Final commit done
- [ ] FC-2: Pushed to remote
- [ ] PT-1: CLAUDE.md updated

**Task 3.4 is ONLY complete when all GATEs have PROOF.**

---

## PHASE 3 COMPLETE

After Task 3.4, Phase 3 (Multi-Turn Editing) is complete!

Capabilities added:
- ✅ Edit images with natural language
- ✅ Preserve thought signatures across edits
- ✅ View edit history/lineage
- ✅ Quick edit presets
- ✅ Navigate between versions

Next: Phase 4 (Platform Optimization) or Phase 5 (Workflow Features)
