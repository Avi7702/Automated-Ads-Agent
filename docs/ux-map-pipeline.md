# UX Map: Pipeline Workflow Pages

> Generated: 2026-02-15
> Covers: Pipeline.tsx, ContentPlanner.tsx, ApprovalQueue.tsx, SocialAccounts.tsx, and all sub-components

---

## P4: Pipeline (route: `/pipeline`)

File: `client/src/pages/Pipeline.tsx`

The Pipeline page is a tabbed container. It renders the Header with `currentPage="pipeline"` and uses URL search params (`?tab=`) to control the active tab. Five lazy-loaded sub-views are embedded.

### S1: Header (shared component)

File: `client/src/components/layout/Header.tsx`

| ID        | Type          | Label/Text             | Action                                                           | API Endpoint              | Data Sent | Notes                                |
| --------- | ------------- | ---------------------- | ---------------------------------------------------------------- | ------------------------- | --------- | ------------------------------------ |
| P4.S1.C1  | Link          | "V3" logo              | Navigates to `/` (Studio)                                        | None                      | -         | Always visible                       |
| P4.S1.C2  | Link          | "Studio"               | Navigates to `/`                                                 | None                      | -         | Desktop nav item                     |
| P4.S1.C3  | Link          | "Gallery"              | Navigates to `/gallery`                                          | None                      | -         | Desktop nav item                     |
| P4.S1.C4  | Link          | "Pipeline"             | Navigates to `/pipeline`                                         | None                      | -         | Active state when on pipeline route  |
| P4.S1.C5  | Link          | "Library"              | Navigates to `/library`                                          | None                      | -         | Desktop nav item                     |
| P4.S1.C6  | Link          | "Settings"             | Navigates to `/settings`                                         | None                      | -         | Desktop nav item                     |
| P4.S1.C7  | Button (icon) | Theme toggle           | Toggles light/dark mode                                          | None                      | -         | ThemeToggle component                |
| P4.S1.C8  | Button (icon) | Sign out (LogOut icon) | Calls `logout()` from AuthContext                                | Likely `/api/auth/logout` | -         | Only shown when user is logged in    |
| P4.S1.C9  | Button (icon) | Menu (hamburger)       | Opens mobile navigation sheet                                    | None                      | -         | Only visible on mobile (`md:hidden`) |
| P4.S1.C10 | Sheet         | Mobile navigation      | Shows full nav items; clicking any item navigates + closes sheet | None                      | -         | Slides from left                     |

### S2: Tab Navigation

| ID       | Type        | Label/Text                            | Action                                   | API Endpoint | Data Sent | Notes                             |
| -------- | ----------- | ------------------------------------- | ---------------------------------------- | ------------ | --------- | --------------------------------- |
| P4.S2.C1 | TabsTrigger | "Dashboard" (LayoutDashboard icon)    | Sets `?tab=dashboard` via `replaceState` | None         | -         | Renders `WeeklyPlanView`          |
| P4.S2.C2 | TabsTrigger | "Content Planner" (CalendarDays icon) | Sets `?tab=planner` via `replaceState`   | None         | -         | Renders `ContentPlanner embedded` |
| P4.S2.C3 | TabsTrigger | "Calendar" (Calendar icon)            | Sets `?tab=calendar` via `replaceState`  | None         | -         | Renders `CalendarView`            |
| P4.S2.C4 | TabsTrigger | "Approval Queue" (CheckCircle icon)   | Sets `?tab=approval` via `replaceState`  | None         | -         | Renders `ApprovalQueue embedded`  |
| P4.S2.C5 | TabsTrigger | "Social Accounts" (Share2 icon)       | Sets `?tab=accounts` via `replaceState`  | None         | -         | Renders `SocialAccounts embedded` |

---

## P4-T1: Dashboard Tab (WeeklyPlanView)

File: `client/src/components/planner/WeeklyPlanView.tsx`

Uses hooks: `useWeeklyPlan(weekStart)`, `useUpdatePlanPost()`, `useRegeneratePlan()`

### S1: Week Navigation Header

| ID         | Type          | Label/Text                  | Action                             | API Endpoint                             | Data Sent              | Notes                                        |
| ---------- | ------------- | --------------------------- | ---------------------------------- | ---------------------------------------- | ---------------------- | -------------------------------------------- |
| P4T1.S1.C1 | Button (icon) | ChevronLeft (Previous week) | Shifts `weekStart` by -1 week      | Triggers `useWeeklyPlan` refetch         | `weekStart` ISO string | -                                            |
| P4T1.S1.C2 | Button (icon) | ChevronRight (Next week)    | Shifts `weekStart` by +1 week      | Triggers `useWeeklyPlan` refetch         | `weekStart` ISO string | -                                            |
| P4T1.S1.C3 | Button (icon) | RefreshCw (Regenerate plan) | Calls `regenerate.mutate(plan.id)` | `useRegeneratePlan` hook (POST endpoint) | `plan.id`              | Disabled while pending, shows spin animation |

### S2: Error State

| ID         | Type   | Label/Text         | Action                                           | API Endpoint                     | Data Sent | Notes               |
| ---------- | ------ | ------------------ | ------------------------------------------------ | -------------------------------- | --------- | ------------------- |
| P4T1.S2.C1 | Button | "Try current week" | Resets `weekStart` to `undefined` (current week) | Triggers `useWeeklyPlan` refetch | -         | Only shown on error |

### S3: Post Cards (per post in plan)

Each post card shows day-of-week, category badge, platform badge, status badge, briefing text, product info, and suggested time. Action buttons vary by status:

| ID         | Type   | Label/Text                        | Action                                            | API Endpoint      | Data Sent                                  | Notes                                               |
| ---------- | ------ | --------------------------------- | ------------------------------------------------- | ----------------- | ------------------------------------------ | --------------------------------------------------- |
| P4T1.S3.C1 | Button | "Create Now" + ArrowRight         | Navigates to `/?planId=X&postIndex=Y&productId=Z` | None (navigation) | Query params: planId, postIndex, productId | Shown when `status === 'planned'`                   |
| P4T1.S3.C2 | Button | "Continue in Studio" + ArrowRight | Same navigation as above                          | None (navigation) | Same query params                          | Shown when `status === 'in_progress'`               |
| P4T1.S3.C3 | Button | "Review" (Eye icon)               | Same navigation as above                          | None (navigation) | Same query params                          | Shown when `status === 'generated'`                 |
| P4T1.S3.C4 | Button | "Schedule" + ArrowRight           | Same navigation as above                          | None (navigation) | Same query params                          | Shown when `status === 'generated'` or `'approved'` |
| P4T1.S3.C5 | Badge  | "Scheduled" (static)              | No action (display only)                          | None              | -                                          | Shown when `status === 'scheduled'`                 |

### S4: Strategy Balance Section

| ID         | Type    | Label/Text            | Action                        | API Endpoint | Data Sent | Notes                                          |
| ---------- | ------- | --------------------- | ----------------------------- | ------------ | --------- | ---------------------------------------------- |
| P4T1.S4.C1 | Display | Category balance bars | No interaction (display only) | None         | -         | Shows actual vs target percentage per category |

---

## P4-T2: Content Planner Tab

File: `client/src/pages/ContentPlanner.tsx`

Renders in embedded mode (no Header). Uses React Query for data fetching.

### S1: Weekly Balance Card

| ID         | Type    | Label/Text                 | Action                        | API Endpoint                       | Data Sent | Notes                                           |
| ---------- | ------- | -------------------------- | ----------------------------- | ---------------------------------- | --------- | ----------------------------------------------- |
| P4T2.S1.C1 | Display | Progress bars per category | No interaction (display only) | `GET /api/content-planner/balance` | -         | Shows current/target posts, percentage progress |

### S2: Suggested Next Post Card

| ID         | Type   | Label/Text                    | Action                                                        | API Endpoint | Data Sent | Notes                                    |
| ---------- | ------ | ----------------------------- | ------------------------------------------------------------- | ------------ | --------- | ---------------------------------------- |
| P4T2.S2.C1 | Button | "View Guide" (BookOpen icon)  | Opens Template Detail Dialog for the suggested template       | None         | -         | Finds full template from categories data |
| P4T2.S2.C2 | Button | "Mark as Posted" (Check icon) | Opens Mark as Posted Dialog with `suggestionData.category.id` | None         | -         | Sets `markAsPostedCategory` state        |

### S3: Recent Posts Section (Last 7 Days)

| ID         | Type          | Label/Text      | Action                                     | API Endpoint                                 | Data Sent | Notes                                                                       |
| ---------- | ------------- | --------------- | ------------------------------------------ | -------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| P4T2.S3.C1 | Button (icon) | Trash2 (delete) | Calls `deletePostMutation.mutate(post.id)` | `DELETE /api/content-planner/posts/{postId}` | -         | Per-post delete button; invalidates balance + suggestion queries on success |

### S4: Content Categories Accordion

| ID         | Type               | Label/Text                                      | Action                                        | API Endpoint | Data Sent | Notes                               |
| ---------- | ------------------ | ----------------------------------------------- | --------------------------------------------- | ------------ | --------- | ----------------------------------- |
| P4T2.S4.C1 | CollapsibleTrigger | Category header (e.g. "Product Showcase 30%")   | Toggles expand/collapse of category section   | None         | -         | Shows ChevronDown/ChevronRight icon |
| P4T2.S4.C2 | Card (clickable)   | Template card (per template in category)        | Opens Template Detail Dialog                  | None         | -         | Sets `selectedTemplate` state       |
| P4T2.S4.C3 | Button             | "Mark [Category] Post as Complete" (Check icon) | Opens Mark as Posted Dialog for that category | None         | -         | One per expanded category           |

### S5: Template Detail Dialog

| ID         | Type          | Label/Text                             | Action                                                                      | API Endpoint | Data Sent | Notes                                            |
| ---------- | ------------- | -------------------------------------- | --------------------------------------------------------------------------- | ------------ | --------- | ------------------------------------------------ |
| P4T2.S5.C1 | Dialog        | Template detail modal                  | Opens when `selectedTemplate` is set; closes via `onOpenChange`             | None         | -         | Max width 2xl, scrollable                        |
| P4T2.S5.C2 | Button (icon) | Copy (per hook formula)                | Copies hook formula text to clipboard via `navigator.clipboard.writeText`   | None         | -         | Shows toast "Copied"                             |
| P4T2.S5.C3 | Button        | "Mark as Posted" (Check icon)          | Opens Mark as Posted Dialog for template's category; closes template dialog | None         | -         | Bottom action button                             |
| P4T2.S5.C4 | Button        | "Create in Studio" (ExternalLink icon) | Opens Start Fresh Warning Dialog                                            | None         | -         | Sets `pendingTemplateId` + `pendingTemplateName` |

### S6: Mark as Posted Dialog (MarkAsPostedDialog component)

| ID         | Type     | Label/Text                 | Action                                    | API Endpoint                      | Data Sent                                  | Notes                                                                  |
| ---------- | -------- | -------------------------- | ----------------------------------------- | --------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| P4T2.S6.C1 | Dialog   | "Mark Post as Complete"    | Opens when `markAsPostedCategory` is set  | None                              | -                                          | -                                                                      |
| P4T2.S6.C2 | Select   | "Post Type"                | Sets `subType` state                      | None                              | -                                          | Options: "General" + all template subTypes for the category            |
| P4T2.S6.C3 | Select   | "Platform (Optional)"      | Sets `platform` state                     | None                              | -                                          | Options: not_specified, linkedin, twitter, facebook, instagram, tiktok |
| P4T2.S6.C4 | Textarea | "Notes (Optional)"         | Sets `notes` state                        | None                              | -                                          | 3 rows                                                                 |
| P4T2.S6.C5 | Button   | "Cancel"                   | Closes dialog via `onOpenChange(false)`   | None                              | -                                          | -                                                                      |
| P4T2.S6.C6 | Button   | "Record Post" (Check icon) | Calls `markAsPostedMutation.mutate(data)` | `POST /api/content-planner/posts` | `{ category, subType, platform?, notes? }` | Invalidates balance + suggestion queries on success; shows toast       |

### S7: Start Fresh Warning Dialog (AlertDialog)

| ID         | Type              | Label/Text                  | Action                                        | API Endpoint      | Data Sent                            | Notes                             |
| ---------- | ----------------- | --------------------------- | --------------------------------------------- | ----------------- | ------------------------------------ | --------------------------------- |
| P4T2.S7.C1 | AlertDialog       | "Start Fresh with Template" | Opens when `showStartFreshModal` is true      | None              | -                                    | Warns about clearing current work |
| P4T2.S7.C2 | AlertDialogCancel | "Cancel"                    | Closes modal, resets pending state            | None              | -                                    | -                                 |
| P4T2.S7.C3 | AlertDialogAction | "Start Fresh"               | Navigates to `/?cpTemplateId={id}&fresh=true` | None (navigation) | URL params: cpTemplateId, fresh=true | Closes both dialogs               |

### Data Fetching (Background)

| Query Key                         | Endpoint                              | Method | Notes                                                                |
| --------------------------------- | ------------------------------------- | ------ | -------------------------------------------------------------------- |
| `/api/content-planner/templates`  | `GET /api/content-planner/templates`  | GET    | Cached 1 hour; returns `{ categories, templates }`                   |
| `/api/content-planner/balance`    | `GET /api/content-planner/balance`    | GET    | Stale after 1 min; returns `{ balance, suggested, totalPosts }`      |
| `/api/content-planner/suggestion` | `GET /api/content-planner/suggestion` | GET    | Stale after 1 min; returns `{ category, suggestedTemplate, reason }` |
| `/api/content-planner/posts`      | `GET /api/content-planner/posts`      | GET    | Returns `ContentPlannerPost[]` (last 7 days)                         |

---

## P4-T3: Calendar Tab (CalendarView)

File: `client/src/components/calendar/CalendarView.tsx`

Custom 7-column CSS grid calendar with month navigation, post cards, and day detail sheet.

### S1: Header Row

| ID         | Type   | Label/Text                          | Action                     | API Endpoint | Data Sent | Notes                                          |
| ---------- | ------ | ----------------------------------- | -------------------------- | ------------ | --------- | ---------------------------------------------- |
| P4T3.S1.C1 | Button | "Schedule Post" / "New" (Plus icon) | Opens `SchedulePostDialog` | None         | -         | Text differs by screen size (hidden sm:inline) |

### S2: Month Navigation

| ID         | Type          | Label/Text                    | Action                                         | API Endpoint                        | Data Sent | Notes                |
| ---------- | ------------- | ----------------------------- | ---------------------------------------------- | ----------------------------------- | --------- | -------------------- |
| P4T3.S2.C1 | Button (icon) | ChevronLeft (Previous month)  | Calls `subMonths(currentMonth, 1)`             | Triggers `useCalendarPosts` refetch | -         | -                    |
| P4T3.S2.C2 | Button (text) | "February 2026" (month label) | Calls `handleToday` -- resets to current month | Triggers refetch                    | -         | Title: "Go to today" |
| P4T3.S2.C3 | Button (icon) | ChevronRight (Next month)     | Calls `addMonths(currentMonth, 1)`             | Triggers `useCalendarPosts` refetch | -         | -                    |

### S3: Calendar Grid (Day Cells)

| ID         | Type              | Label/Text                   | Action                                               | API Endpoint | Data Sent | Notes                                                           |
| ---------- | ----------------- | ---------------------------- | ---------------------------------------------------- | ------------ | --------- | --------------------------------------------------------------- |
| P4T3.S3.C1 | Button (day cell) | Day number + mini post cards | Calls `handleDayClick(day)` -- opens `DayPostsSheet` | None         | -         | One per visible day; outside-month days are pointer-events-none |

### S4: Empty Month State

| ID         | Type   | Label/Text                    | Action                     | API Endpoint | Data Sent | Notes                               |
| ---------- | ------ | ----------------------------- | -------------------------- | ------------ | --------- | ----------------------------------- |
| P4T3.S4.C1 | Button | "Schedule a post" (Plus icon) | Opens `SchedulePostDialog` | None         | -         | Only shown when zero posts in month |

### S5: DayPostsSheet (slide-over panel)

File: `client/src/components/calendar/DayPostsSheet.tsx`

| ID         | Type          | Label/Text                           | Action                                                     | API Endpoint                                        | Data Sent | Notes                                                                |
| ---------- | ------------- | ------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------- | --------- | -------------------------------------------------------------------- |
| P4T3.S5.C1 | Sheet         | Day detail panel                     | Opens when `selectedDay` is set; closes via `onOpenChange` | None                                                | -         | Side panel, scrollable timeline                                      |
| P4T3.S5.C2 | Button (text) | "Show more" / "Show less" (per post) | Toggles caption expansion                                  | None                                                | -         | Only shown for captions > 180 chars                                  |
| P4T3.S5.C3 | Link          | "View on platform" (ExternalLink)    | Opens `post.platformPostUrl` in new tab                    | None                                                | -         | Only shown for published posts with URL                              |
| P4T3.S5.C4 | Button        | "Retry" (RotateCcw icon)             | Shows toast guidance to reschedule                         | None                                                | -         | Only shown for failed posts                                          |
| P4T3.S5.C5 | Button        | "Cancel" (XCircle icon)              | Calls `cancelPost.mutateAsync(postId)`                     | `useCancelPost` hook (likely DELETE/PATCH endpoint) | `postId`  | Only shown for scheduled/draft posts; shows toast on success/failure |

### S6: SchedulePostDialog

File: `client/src/components/calendar/SchedulePostDialog.tsx`

| ID          | Type            | Label/Text                        | Action                                 | API Endpoint                           | Data Sent                                                                                                | Notes                                                                  |
| ----------- | --------------- | --------------------------------- | -------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| P4T3.S6.C1  | Dialog          | "Schedule Post"                   | Opens via CalendarView button          | None                                   | -                                                                                                        | Full form dialog                                                       |
| P4T3.S6.C2  | Input (date)    | "Date"                            | Sets `date` state                      | None                                   | -                                                                                                        | Min = today; required                                                  |
| P4T3.S6.C3  | Input (time)    | "Time"                            | Sets `time` state                      | None                                   | -                                                                                                        | Default "10:00"; required                                              |
| P4T3.S6.C4  | Select          | "Social Account"                  | Sets `connectionId` state              | None                                   | -                                                                                                        | Options from `GET /api/social/accounts`; shows platform icon + name    |
| P4T3.S6.C5  | Link            | "Connect an account in Pipeline"  | Navigates to `/pipeline?tab=social`    | None                                   | -                                                                                                        | Only shown when no active accounts                                     |
| P4T3.S6.C6  | Textarea        | "Caption"                         | Sets `caption` state                   | None                                   | -                                                                                                        | 5 rows; shows character counter + progress bar based on platform limit |
| P4T3.S6.C7  | Input (text)    | "Hashtags"                        | Sets `hashtags` state                  | None                                   | -                                                                                                        | Comma/space separated; optional                                        |
| P4T3.S6.C8  | Input (text)    | "Image (optional)"                | Sets `imageUrl` state                  | None                                   | -                                                                                                        | Shows live image preview if valid URL                                  |
| P4T3.S6.C9  | Button          | "Cancel"                          | Closes dialog                          | None                                   | -                                                                                                        | -                                                                      |
| P4T3.S6.C10 | Button (submit) | "Schedule Post" / "Scheduling..." | Calls `schedulePost.mutateAsync(data)` | `useSchedulePost` hook (POST endpoint) | `{ connectionId, caption, hashtags?, imageUrl?, imagePublicId?, scheduledFor, timezone, generationId? }` | Validates all fields; shows toast on success/failure                   |

### Data Fetching (Background)

| Query Key                                | Endpoint                                 | Method | Notes                                       |
| ---------------------------------------- | ---------------------------------------- | ------ | ------------------------------------------- |
| Calendar posts                           | `useCalendarPosts(rangeStart, rangeEnd)` | GET    | Date range for visible grid                 |
| Calendar counts                          | `useCalendarCounts(year, month)`         | GET    | Day-level scheduled/published/failed counts |
| Social accounts (for SchedulePostDialog) | `GET /api/social/accounts`               | GET    | Stale after 60s                             |

---

## P4-T4: Approval Queue Tab

File: `client/src/pages/ApprovalQueue.tsx`

Renders in embedded mode (no Header). Uses direct fetch calls for data.

### S1: Page Header

| ID         | Type   | Label/Text                 | Action               | API Endpoint                       | Data Sent                                | Notes                                           |
| ---------- | ------ | -------------------------- | -------------------- | ---------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| P4T4.S1.C1 | Button | "Refresh" (RefreshCw icon) | Calls `fetchQueue()` | `GET /api/approval-queue?{params}` | Query params: status, priority, platform | Disabled while loading; icon spins when loading |

### S2: Quick Stats (display only)

| ID         | Type | Label/Text                  | Action         | API Endpoint | Data Sent | Notes                       |
| ---------- | ---- | --------------------------- | -------------- | ------------ | --------- | --------------------------- |
| P4T4.S2.C1 | Card | "Pending Review" count      | No interaction | None         | -         | Computed from fetched items |
| P4T4.S2.C2 | Card | "Avg Confidence" percentage | No interaction | None         | -         | Computed from fetched items |
| P4T4.S2.C3 | Card | "Urgent Items" count        | No interaction | None         | -         | Computed from fetched items |
| P4T4.S2.C4 | Card | "High Priority" count       | No interaction | None         | -         | Computed from fetched items |

### S3: Filters

| ID         | Type   | Label/Text | Action                                               | API Endpoint                               | Data Sent      | Notes                                                                                |
| ---------- | ------ | ---------- | ---------------------------------------------------- | ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------ |
| P4T4.S3.C1 | Select | "Status"   | Sets `statusFilter` state; triggers `fetchQueue()`   | `GET /api/approval-queue?status={value}`   | status param   | Options: All Statuses, Pending Review, Approved, Rejected, Needs Revision, Scheduled |
| P4T4.S3.C2 | Select | "Priority" | Sets `priorityFilter` state; triggers `fetchQueue()` | `GET /api/approval-queue?priority={value}` | priority param | Options: All Priorities, Urgent, High, Medium, Low                                   |
| P4T4.S3.C3 | Select | "Platform" | Sets `platformFilter` state; triggers `fetchQueue()` | `GET /api/approval-queue?platform={value}` | platform param | Options: All Platforms, LinkedIn, Instagram, Facebook, Twitter                       |

### S4: Bulk Actions Bar

File: `client/src/components/approval/BulkActions.tsx`

| ID         | Type          | Label/Text                                   | Action                                         | API Endpoint                                      | Data Sent                                   | Notes                                                  |
| ---------- | ------------- | -------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| P4T4.S4.C1 | Button (icon) | X (Deselect all)                             | Clears `selectedIds` set                       | None                                              | -                                           | Left side of bar                                       |
| P4T4.S4.C2 | Button        | "Select all {N}"                             | Adds all item IDs to `selectedIds`             | None                                              | -                                           | Only shown when not all selected                       |
| P4T4.S4.C3 | Button        | "Approve Selected ({N})" (CheckCircle2 icon) | Calls `handleBulkApprove()`                    | `POST /api/approval-queue/bulk-approve`           | `{ ids: string[], notes: "Bulk approved" }` | Green button; disabled while processing                |
| P4T4.S4.C4 | Button        | "Reject Selected ({N})" (XCircle icon)       | Calls `handleBulkReject()` with confirm dialog | `POST /api/approval-queue/{id}/reject` (per item) | `{ reason: "Bulk rejected" }` per item      | Red outline; uses `Promise.all` for parallel rejection |

### S5: Queue Cards (per item)

File: `client/src/components/approval/QueueCard.tsx`

| ID         | Type          | Label/Text                          | Action                                                | API Endpoint                            | Data Sent                     | Notes                                    |
| ---------- | ------------- | ----------------------------------- | ----------------------------------------------------- | --------------------------------------- | ----------------------------- | ---------------------------------------- |
| P4T4.S5.C1 | Checkbox      | Selection checkbox                  | Calls `toggleSelection(itemId, selected)`             | None                                    | -                             | Adds/removes from `selectedIds` set      |
| P4T4.S5.C2 | Button        | "Quick Approve" (CheckCircle2 icon) | Calls `handleQuickApprove(item.id)`                   | `POST /api/approval-queue/{id}/approve` | `{ notes: "Quick approved" }` | Green button                             |
| P4T4.S5.C3 | Button        | "Review" (Eye icon)                 | Opens ReviewModal for this item                       | None                                    | -                             | Sets `reviewingItem` state               |
| P4T4.S5.C4 | Button (icon) | Trash2 (delete)                     | Calls `handleDelete(item.id)` with `confirm()` dialog | `DELETE /api/approval-queue/{id}`       | -                             | Only visible on hover (motion animation) |

### S6: Review Modal

File: `client/src/components/approval/ReviewModal.tsx`

| ID         | Type     | Label/Text                               | Action                                        | API Endpoint                            | Data Sent                                          | Notes                     |
| ---------- | -------- | ---------------------------------------- | --------------------------------------------- | --------------------------------------- | -------------------------------------------------- | ------------------------- |
| P4T4.S6.C1 | Dialog   | "Review Content #{id}"                   | Opens when `reviewingItem` is set             | None                                    | -                                                  | Max width 4xl, scrollable |
| P4T4.S6.C2 | Textarea | "Optional: Add approval notes"           | Sets `notes` state                            | None                                    | -                                                  | 3 rows                    |
| P4T4.S6.C3 | Button   | "Reject" (XCircle icon)                  | Calls `handleReject(item.id, notes)`          | `POST /api/approval-queue/{id}/reject`  | `{ reason: notes or "Rejected" }`                  | Red outline button        |
| P4T4.S6.C4 | Button   | "Needs Revision" (Pause icon)            | Calls `handleRequestRevision(item.id, notes)` | `PATCH /api/approval-queue/{id}`        | `{ status: "needs_revision", reviewNotes: notes }` | Outline button            |
| P4T4.S6.C5 | Button   | "Approve & Schedule" (CheckCircle2 icon) | Calls `handleApprove(item.id, notes)`         | `POST /api/approval-queue/{id}/approve` | `{ notes }`                                        | Green button              |

### Data Fetching (Background)

| Endpoint                                                 | Method | Triggers                                       | Notes                                                |
| -------------------------------------------------------- | ------ | ---------------------------------------------- | ---------------------------------------------------- |
| `GET /api/approval-queue?status=X&priority=Y&platform=Z` | GET    | On mount + filter changes + after any mutation | Returns `{ items: [] }` or `{ data: { items: [] } }` |

---

## P4-T5: Social Accounts Tab

File: `client/src/pages/SocialAccounts.tsx`

Renders in embedded mode (no Header). Uses direct fetch calls.

### S1: Page Header

| ID         | Type   | Label/Text                                   | Action                      | API Endpoint               | Data Sent | Notes                                          |
| ---------- | ------ | -------------------------------------------- | --------------------------- | -------------------------- | --------- | ---------------------------------------------- |
| P4T5.S1.C1 | Button | "Refresh" / "Refreshing..." (RefreshCw icon) | Calls `fetchAccounts(true)` | `GET /api/social/accounts` | -         | Disabled while loading; shows toast on success |

### S2: Connected Account Cards

File: `client/src/components/social/ConnectedAccountCard.tsx`

One card per connected account showing platform icon, username, status badge, account type, connection date, last used date, and error info.

| ID         | Type              | Label/Text                        | Action                                    | API Endpoint                              | Data Sent | Notes                                                                     |
| ---------- | ----------------- | --------------------------------- | ----------------------------------------- | ----------------------------------------- | --------- | ------------------------------------------------------------------------- |
| P4T5.S2.C1 | Button            | "Disconnect" (Unplug icon)        | Opens disconnect confirmation AlertDialog | None                                      | -         | Red text; per account card                                                |
| P4T5.S2.C2 | AlertDialog       | "Disconnect {Platform} Account?"  | Confirmation dialog                       | None                                      | -         | Warns about OAuth persistence in n8n                                      |
| P4T5.S2.C3 | AlertDialogCancel | "Cancel"                          | Closes dialog                             | None                                      | -         | -                                                                         |
| P4T5.S2.C4 | AlertDialogAction | "Disconnect" / "Disconnecting..." | Calls `onDisconnect(account.id)`          | `DELETE /api/social/accounts/{accountId}` | -         | Red button; shows Loader2 while processing; refetches accounts on success |

### S3: n8n Setup Instructions Card

| ID         | Type          | Label/Text                                | Action                                                                   | API Endpoint         | Data Sent | Notes                                   |
| ---------- | ------------- | ----------------------------------------- | ------------------------------------------------------------------------ | -------------------- | --------- | --------------------------------------- |
| P4T5.S3.C1 | Button        | "Sync Accounts from n8n" (RefreshCw icon) | Calls `handleSyncFromN8n()`                                              | NOT IMPLEMENTED      | -         | Currently shows "Not Implemented" toast |
| P4T5.S3.C2 | Button (link) | "n8n Documentation" (ExternalLink icon)   | Opens `https://docs.n8n.io/integrations/builtin/credentials/` in new tab | None (external link) | -         | `target="_blank"`                       |

### Data Fetching (Background)

| Endpoint                   | Method | Triggers                                     | Notes                                      |
| -------------------------- | ------ | -------------------------------------------- | ------------------------------------------ |
| `GET /api/social/accounts` | GET    | On mount + refresh button + after disconnect | Returns `{ accounts: SocialConnection[] }` |

---

## API Endpoint Summary (All Pipeline Pages)

| Endpoint                                 | Method              | Used By                            | Purpose                              |
| ---------------------------------------- | ------------------- | ---------------------------------- | ------------------------------------ |
| `GET /api/content-planner/templates`     | GET                 | ContentPlanner                     | Fetch content categories + templates |
| `GET /api/content-planner/balance`       | GET                 | ContentPlanner                     | Weekly posting balance               |
| `GET /api/content-planner/suggestion`    | GET                 | ContentPlanner                     | AI-suggested next post               |
| `GET /api/content-planner/posts`         | GET                 | ContentPlanner                     | Recent posts (last 7 days)           |
| `POST /api/content-planner/posts`        | POST                | ContentPlanner                     | Mark post as completed               |
| `DELETE /api/content-planner/posts/{id}` | DELETE              | ContentPlanner                     | Delete a recorded post               |
| `GET /api/approval-queue`                | GET                 | ApprovalQueue                      | Fetch queue items with filters       |
| `POST /api/approval-queue/{id}/approve`  | POST                | ApprovalQueue                      | Approve a single item                |
| `POST /api/approval-queue/{id}/reject`   | POST                | ApprovalQueue                      | Reject a single item                 |
| `PATCH /api/approval-queue/{id}`         | PATCH               | ApprovalQueue                      | Update item (request revision)       |
| `DELETE /api/approval-queue/{id}`        | DELETE              | ApprovalQueue                      | Delete queue item                    |
| `POST /api/approval-queue/bulk-approve`  | POST                | ApprovalQueue                      | Bulk approve multiple items          |
| `GET /api/social/accounts`               | GET                 | SocialAccounts, SchedulePostDialog | Fetch connected social accounts      |
| `DELETE /api/social/accounts/{id}`       | DELETE              | SocialAccounts                     | Disconnect a social account          |
| `useWeeklyPlan(weekStart)`               | GET (hook)          | WeeklyPlanView                     | Fetch weekly plan                    |
| `useRegeneratePlan()`                    | POST (hook)         | WeeklyPlanView                     | Regenerate weekly plan               |
| `useCalendarPosts(start, end)`           | GET (hook)          | CalendarView                       | Fetch posts for date range           |
| `useCalendarCounts(year, month)`         | GET (hook)          | CalendarView                       | Fetch day-level counts               |
| `useCancelPost()`                        | PATCH/DELETE (hook) | DayPostsSheet                      | Cancel a scheduled post              |
| `useSchedulePost()`                      | POST (hook)         | SchedulePostDialog                 | Schedule a new post                  |

---

## Component Tree Summary

```
Pipeline.tsx
  |-- Header (currentPage="pipeline")
  |   |-- Logo Link -> /
  |   |-- Nav Links (Studio, Gallery, Pipeline, Library, Settings)
  |   |-- ThemeToggle
  |   |-- Logout Button
  |   |-- Mobile Menu Sheet
  |
  |-- Tabs (URL param: ?tab=)
      |-- "dashboard" -> WeeklyPlanView
      |   |-- Week navigation (prev/next/regenerate)
      |   |-- Post cards with status-based action buttons
      |   |-- Strategy balance bars
      |
      |-- "planner" -> ContentPlanner (embedded)
      |   |-- Weekly Balance Card (display)
      |   |-- Suggested Next Post Card (View Guide + Mark as Posted)
      |   |-- Recent Posts (delete per post)
      |   |-- Content Categories Accordion
      |   |   |-- Category headers (expand/collapse)
      |   |   |-- Template cards (click to open detail)
      |   |   |-- Mark as Complete button per category
      |   |-- Template Detail Dialog
      |   |   |-- Copy hook formulas
      |   |   |-- Mark as Posted
      |   |   |-- Create in Studio -> Start Fresh Warning
      |   |-- Mark as Posted Dialog (subtype, platform, notes, submit)
      |   |-- Start Fresh Warning AlertDialog
      |
      |-- "calendar" -> CalendarView
      |   |-- Schedule Post button
      |   |-- Month navigation (prev/today/next)
      |   |-- StatsBar (scheduled/published/failed counts)
      |   |-- 7-column day grid (click to open DayPostsSheet)
      |   |-- DayPostsSheet (timeline of posts per day)
      |   |   |-- Cancel post button
      |   |   |-- Retry button (failed posts)
      |   |   |-- View on platform link (published posts)
      |   |   |-- Show more/less caption toggle
      |   |-- SchedulePostDialog (date, time, account, caption, hashtags, image, submit)
      |
      |-- "approval" -> ApprovalQueue (embedded)
      |   |-- Refresh button
      |   |-- Stats cards (display)
      |   |-- Filters (status, priority, platform selects)
      |   |-- BulkActions bar (select all, deselect, bulk approve, bulk reject)
      |   |-- QueueCards (checkbox, quick approve, review, delete)
      |   |-- ReviewModal (approve, reject, needs revision, notes)
      |
      |-- "accounts" -> SocialAccounts (embedded)
          |-- Refresh button
          |-- ConnectedAccountCards (disconnect with confirmation)
          |-- Sync from n8n button (not implemented)
          |-- n8n Documentation link
```
