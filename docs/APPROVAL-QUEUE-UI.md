# Approval Queue UI - Phase 8.0 HITL Approval System

**Status**: ✅ Complete
**Created**: January 25, 2026
**Location**: `client/src/pages/ApprovalQueue.tsx`

## Overview

The Approval Queue UI is the main user-facing interface for reviewing and approving AI-generated content. It implements a Human-In-The-Loop (HITL) approval workflow with priority-based queue management, bulk actions, and detailed review capabilities.

## Components Created

### 1. Main Page: `ApprovalQueue.tsx`
**Location**: `client/src/pages/ApprovalQueue.tsx`

Main dashboard for content approval with:
- Priority-based queue sections (Urgent, High Priority, Standard)
- Real-time filtering by status, priority, and platform
- Quick stats dashboard (total pending, avg confidence, urgent count)
- Empty states and loading skeletons
- Responsive design (mobile/tablet/desktop)

**Route**: `/approval-queue` (protected)

### 2. Supporting Components

#### `PriorityBadge.tsx`
**Location**: `client/src/components/approval/PriorityBadge.tsx`

Visual priority indicator with color coding:
- **Urgent**: Red (Flame icon)
- **High**: Orange (AlertCircle icon)
- **Medium**: Yellow (TrendingUp icon)
- **Low**: Gray (Minus icon)

#### `QueueCard.tsx`
**Location**: `client/src/components/approval/QueueCard.tsx`

Compact card for each queue item displaying:
- Thumbnail preview (image or placeholder)
- Caption snippet (truncated to 80 chars)
- Platform badge with icon
- Confidence score indicator
- Priority badge
- Scheduled time (if urgent and scheduled soon)
- Quick actions: Quick Approve, Review, Delete (on hover)
- Checkbox for bulk selection

Features:
- Animated entry (staggered by index)
- Hover effects with smooth transitions
- Selection state highlighting

#### `BulkActions.tsx`
**Location**: `client/src/components/approval/BulkActions.tsx`

Sticky toolbar for bulk operations:
- Selected count display
- "Select All" / "Deselect All" buttons
- Bulk Approve button (green)
- Bulk Reject button (red outline)
- Animated show/hide based on selection
- Processing state handling

#### `ReviewModal.tsx`
**Location**: `client/src/components/approval/ReviewModal.tsx`

Detailed review dialog with:

**Quick Stats Section**:
- Quality score (0-100 with star rating)
- Confidence percentage
- Character count (with limit validation)
- Framework badge (AIDA, PAS, etc.)

**Content Preview**:
- Full-size image preview with aspect ratio badge
- Platform icon and name
- Complete caption text (scrollable)

**Validation Checks**:
- Character limit status
- Safety checks passed/flagged
- Compliance flags (legal claims, pricing)
- CTA presence detection

**AI Reasoning**:
- AI recommendation explanation
- Amber-highlighted reasoning box

**Action Buttons**:
- ✅ Approve & Schedule (green)
- ✗ Reject (red)
- ⏸ Needs Revision (gray)
- Optional notes field for all decisions

## API Integration

The UI integrates with the following API endpoints:

### GET `/api/approval-queue`
Fetch queue items with filters:
```typescript
Query params:
- status: 'pending_review' | 'approved' | 'rejected' | 'needs_revision' | 'scheduled'
- priority: 'urgent' | 'high' | 'medium' | 'low'
- platform: 'linkedin' | 'instagram' | 'facebook' | 'twitter'
```

### POST `/api/approval-queue/:id/approve`
Approve a single item:
```typescript
Body: { notes?: string }
```

### POST `/api/approval-queue/:id/reject`
Reject a single item:
```typescript
Body: { reason: string }
```

### PATCH `/api/approval-queue/:id`
Update queue item (e.g., request revision):
```typescript
Body: {
  status?: string,
  reviewNotes?: string
}
```

### DELETE `/api/approval-queue/:id`
Delete a queue item

### POST `/api/approval-queue/bulk-approve`
Bulk approve multiple items:
```typescript
Body: {
  ids: string[],
  notes?: string
}
```

## TypeScript Types

```typescript
interface ApprovalQueueItem {
  id: string;
  userId: string;
  adCopyId?: string;
  generationId?: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_revision' | 'scheduled' | 'published' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  aiConfidenceScore?: number;
  aiRecommendation?: 'auto_approve' | 'manual_review' | 'auto_reject';
  aiReasoning?: string;
  safetyChecksPassed?: any;
  complianceFlags?: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
  adCopy?: {
    caption: string;
    headline?: string;
    hook?: string;
    cta?: string;
    platform: string;
    framework?: string;
    qualityScore?: any;
  };
  generation?: {
    generatedImagePath: string;
    prompt?: string;
    aspectRatio?: string;
  };
}
```

## UI Patterns Used

### Design System
- **Cards**: `bg-white rounded-lg shadow-sm border`
- **Badges**: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium`
- **Buttons**: shadcn/ui Button component with variants
- **Colors**: Tailwind CSS utility classes with dark mode support

### Priority Colors
- Urgent: `bg-red-100 text-red-800 border-red-200`
- High: `bg-orange-100 text-orange-800 border-orange-200`
- Medium: `bg-yellow-100 text-yellow-800 border-yellow-200`
- Low: `bg-gray-100 text-gray-800 border-gray-200`

### Animations
- Framer Motion for smooth transitions
- Staggered card entry animations (50ms delay between items)
- Hover scale effects on interactive elements
- Slide-in animations for bulk actions toolbar

## Features Implemented

### ✅ Real-time Filtering
- Filter by status, priority, platform
- Instant results update on filter change
- URL params preserved (future enhancement)

### ✅ Bulk Selection
- Checkbox on each card
- "Select All" button
- Selected count display
- Bulk approve/reject actions

### ✅ Quick Actions
- Quick approve from card (1-click approval)
- Detailed review modal (full content + AI reasoning)
- Delete action (with confirmation)

### ✅ Priority-Based Sections
- Urgent items shown first (red header)
- High priority items second (orange header)
- Standard queue last (blue header)
- Empty state when no items match filters

### ✅ Loading States
- Skeleton loaders during fetch
- Processing indicators on buttons
- Disabled states during API calls

### ✅ Error Handling
- Toast notifications for all errors
- Graceful fallbacks for missing data
- Network error recovery

### ✅ Responsive Design
- Mobile-optimized touch targets (44px+)
- Stacked layout on small screens
- Grid layout on desktop (stats cards)
- Scrollable content areas

## Usage

### Accessing the Approval Queue
Navigate to `/approval-queue` in the application.

### Reviewing Content
1. **Quick Approve**: Click "Quick Approve" on any card for instant approval
2. **Detailed Review**: Click "Review" to open the full review modal
3. **Bulk Actions**: Select multiple items and use "Approve Selected" or "Reject Selected"

### Filtering
Use the filter dropdowns to narrow down items:
- **Status**: Show only pending, approved, rejected, etc.
- **Priority**: Show only urgent, high, medium, or low priority items
- **Platform**: Filter by LinkedIn, Instagram, Facebook, Twitter

### Review Modal Actions
1. **Approve & Schedule**: Marks content as approved and schedules for posting
2. **Reject**: Marks content as rejected (requires confirmation)
3. **Needs Revision**: Sends content back for revision with optional notes

## Database Schema

The UI works with the `approval_queue` table from `shared/schema.ts`:

```sql
CREATE TABLE approval_queue (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  ad_copy_id VARCHAR,
  generation_id VARCHAR,
  status VARCHAR(20) DEFAULT 'pending_review',
  priority VARCHAR(10) DEFAULT 'medium',
  ai_confidence_score INTEGER,
  ai_recommendation VARCHAR(20),
  ai_reasoning TEXT,
  safety_checks_passed JSONB,
  compliance_flags TEXT[],
  reviewed_by VARCHAR,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  scheduled_for TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Testing Checklist

- [ ] Page loads without errors
- [ ] Filters update queue correctly
- [ ] Quick approve works
- [ ] Review modal opens and displays all data
- [ ] Approve/Reject/Revision actions work
- [ ] Bulk selection works
- [ ] Bulk approve/reject work
- [ ] Delete item works with confirmation
- [ ] Loading states show during API calls
- [ ] Error toasts appear on failures
- [ ] Empty state shows when no items
- [ ] Priority sections sort correctly
- [ ] Responsive design works on mobile
- [ ] Dark mode styling correct

## Future Enhancements

- [ ] URL params for shareable filtered views
- [ ] Keyboard shortcuts (A=approve, R=reject, N=next)
- [ ] Inline editing of caption text
- [ ] Real-time updates via WebSocket
- [ ] Export queue to CSV
- [ ] Advanced filters (date range, confidence threshold)
- [ ] Saved filter presets
- [ ] Batch scheduling (select time for multiple items)

## Dependencies

**UI Components**:
- shadcn/ui (Button, Card, Dialog, Select, Textarea, Badge, Skeleton)
- Framer Motion (animations)
- Lucide React (icons)
- Tailwind CSS (styling)

**React Hooks**:
- `useState` - Component state
- `useEffect` - Data fetching
- `useToast` - Notifications

## File Structure

```
client/src/
├── pages/
│   └── ApprovalQueue.tsx          # Main page (600+ lines)
├── components/
│   └── approval/
│       ├── PriorityBadge.tsx     # Priority indicator (40 lines)
│       ├── QueueCard.tsx          # Queue item card (180 lines)
│       ├── BulkActions.tsx        # Bulk operations toolbar (80 lines)
│       └── ReviewModal.tsx        # Detailed review dialog (350 lines)
└── App.tsx                        # Route added: /approval-queue
```

## Notes for Developers

1. **Type Safety**: All components use TypeScript with proper type annotations
2. **Error Boundaries**: Page wrapped in ErrorBoundary from App.tsx
3. **Authentication**: Route protected by ProtectedRoute component
4. **Toast Notifications**: Uses shadcn/ui toast system
5. **API Calls**: All use `credentials: 'include'` for session auth
6. **Loading States**: Always show loading UI during async operations
7. **Confirmation Dialogs**: Use native `confirm()` for destructive actions
8. **Accessibility**: Proper ARIA labels and semantic HTML

## Related Documentation

- [Phase 8.0 Implementation Plan](./PHASE-8-IMPLEMENTATION-PLAN.md)
- [Approval Queue Backend](./PHASE-8-BACKEND-APPROVAL-QUEUE.md)
- [Component Classification Schema](./COMPONENT-CLASSIFICATION-SCHEMA.md)
