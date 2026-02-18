# UAT Checklist — Release Candidate 2026-02-17

## Instructions

- **Test against:** https://automated-ads-agent-production.up.railway.app
- Record **PASS/FAIL** + notes for each scenario
- Screenshots: save to `docs/uat/screenshots/` with the scenario number as filename prefix (e.g., `01-login-success.png`)
- Test in both **desktop** (1280x800+) and **mobile** (375x812) viewports where applicable
- Use Chrome or Firefox latest stable

---

## Scenarios

### AUTH (Authentication & Session)

| #   | Scenario                       | Steps                                                                                                                                    | Expected Result                                                                                                                | Pass/Fail | Notes |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- | ----- |
| 1   | Login with email/password      | 1. Navigate to `/login`. 2. Enter valid email in the "Email" field. 3. Enter valid password in the "Password" field. 4. Click "Sign In". | Redirected to Studio (`/`). Header shows user email and logout icon. OnboardingGate may show onboarding wizard if first login. |           |       |
| 2   | Login with Google OAuth        | 1. Navigate to `/login`. 2. Click "Sign in with Google". 3. Complete Google OAuth flow.                                                  | Redirected to Studio (`/`). Header shows user email.                                                                           |           |       |
| 3   | Login with invalid credentials | 1. Navigate to `/login`. 2. Enter a valid email address. 3. Enter an incorrect password. 4. Click "Sign In".                             | Red error alert appears below the form fields with a descriptive message. User stays on `/login`.                              |           |       |
| 4   | Session persistence on refresh | 1. Log in successfully. 2. Press F5 / Ctrl+R to reload the page.                                                                         | User remains authenticated. Studio loads without redirect to `/login`. Header still shows user email.                          |           |       |
| 5   | Logout                         | 1. While authenticated, click the logout icon (LogOut) in the top-right header area.                                                     | Redirected to `/login`. Attempting to navigate to `/` redirects back to `/login`.                                              |           |       |

---

### STUDIO (Core Creative Workflow)

| #   | Scenario                                     | Steps                                                                                                                                                                                                  | Expected Result                                                                                                                                                                                                       | Pass/Fail | Notes |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----- |
| 6   | Select products and view context bar         | 1. On Studio (`/`), expand the "Products" collapsible section in the ComposerView. 2. Select 1-2 products from the product list by clicking on them.                                                   | Selected products are highlighted. Context bar appears near the top showing product count, selected template (if any), and current platform.                                                                          |           |       |
| 7   | Get idea suggestions from Idea Bank          | 1. With at least one product selected, scroll down to the Idea Bank Bar at the bottom of the Studio page (desktop). 2. Observe the suggestion chips that load. 3. Click on a suggestion chip.          | Suggestion chips appear as horizontally scrollable pills. Clicking a chip populates the main prompt textarea with the suggestion text.                                                                                |           |       |
| 8   | Generate an image                            | 1. Select at least one product. 2. Type or select a prompt describing the desired scene. 3. Choose platform and aspect ratio from output settings. 4. Click the "Generate" button.                     | View transitions from ComposerView to GeneratingView (loading animation). After processing, ResultViewEnhanced appears showing the generated image. Inspector Panel on the right shows Edit/Copy/Ask AI/Details tabs. |           |       |
| 9   | Generate copy and hashtags (Inspector Panel) | 1. After generating an image (Scenario 8), look at the Inspector Panel on the right (desktop). 2. Click the "Copy" tab. 3. Review the generated caption, headline, hook, and hashtags.                 | Copy tab displays platform-appropriate ad copy with caption text, optional headline/hook, CTA, and hashtags. Copy-to-clipboard buttons work.                                                                          |           |       |
| 10  | Save generation to catalog                   | 1. After generating an image (Scenario 8), click the "Save to Catalog" action (if visible in result actions). 2. In the SaveToCatalogDialog, review the default name and image. 3. Click Save/Confirm. | Dialog appears with image preview and editable name field. After saving, a success toast notification appears.                                                                                                        |           |       |
| 11  | View generation history                      | 1. On Studio, click the "History" button in the hero section. 2. The History Panel should slide in on the right. 3. Click on a past generation entry.                                                  | History panel opens showing a list of previous generations with thumbnails and dates. Clicking an entry loads that generation into the ResultViewEnhanced view.                                                       |           |       |

---

### GALLERY (Generation Archive)

| #   | Scenario                      | Steps                                                                                                                                                                                                                     | Expected Result                                                                                                                                                                                                     | Pass/Fail | Notes |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----- |
| 12  | Browse gallery                | 1. Click "Gallery" in the header navigation. 2. Observe the grid of generated images loading.                                                                                                                             | Gallery page (`/gallery`) loads showing a responsive grid (2-5 columns) of all past generations. Each card shows the image, and on hover shows the prompt text and date. Total count is displayed near the heading. |           |       |
| 13  | Search and sort gallery       | 1. On Gallery page, type a keyword in the "Search prompts..." input. 2. Observe filtered results. 3. Use the sort dropdown to switch between "Newest first" and "Oldest first".                                           | Results filter in real-time as you type. Sorting re-orders the grid immediately. Count updates to reflect filtered results.                                                                                         |           |       |
| 14  | Select and delete generations | 1. On Gallery, hover over an image and click the circular select checkbox (top-left of card). 2. Select 1-2 images. 3. Click the red "Delete" button that appears in the top bar. 4. Confirm deletion in the AlertDialog. | Selection count shown (e.g., "2 selected"). Delete confirmation dialog appears. After confirming, images are removed and a success toast displays. Grid refreshes without deleted items.                            |           |       |

---

### PIPELINE (Planning & Approval)

| #   | Scenario                         | Steps                                                                                                                                                                                                                            | Expected Result                                                                                                                                                                                                                        | Pass/Fail | Notes |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----- |
| 15  | View Pipeline Dashboard          | 1. Click "Pipeline" in the header navigation. 2. Land on the Dashboard tab (default).                                                                                                                                            | Pipeline page loads at `/pipeline`. Dashboard tab is active, showing the WeeklyPlanView with content plan overview. Five tabs visible: Dashboard, Content Planner, Calendar, Approval Queue, Social Accounts.                          |           |       |
| 16  | Use Content Planner              | 1. On Pipeline page, click the "Content Planner" tab. 2. Wait for the planner to load. 3. If available, request a content suggestion or browse existing plan items.                                                              | Content Planner tab loads with category-based content planning. Shows content categories, templates, balance data, and suggestion functionality.                                                                                       |           |       |
| 17  | Approve/Reject in Approval Queue | 1. On Pipeline page, click the "Approval Queue" tab. 2. Wait for the queue to load. 3. If items exist with "pending_review" status, click on an item to open the ReviewModal. 4. Approve or Reject the item with optional notes. | Queue loads with QueueCard components showing AI confidence scores and recommendations. ReviewModal opens with item details. After approving/rejecting, item status updates and a toast confirms the action. Stats at the top refresh. |           |       |

---

### LIBRARY (Resource Management)

| #   | Scenario              | Steps                                                                                                                                                                | Expected Result                                                                                                                                                                                                              | Pass/Fail | Notes |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----- |
| 18  | Browse Products tab   | 1. Click "Library" in the header navigation. 2. Land on the "Products" tab (default). 3. Browse the product list.                                                    | Library page (`/library`) loads with 6 tabs: Products, Brand Images, Ad References, Gen Templates, Scenarios, Patterns. Products tab shows the product catalog with images and details.                                      |           |       |
| 19  | Navigate Library tabs | 1. On Library page, click each tab in sequence: Brand Images, Ad References, Gen Templates, Scenarios, Patterns. 2. Observe each tab loading its respective content. | Each tab loads its respective embedded page content (BrandImageLibrary, TemplateLibrary, Templates, InstallationScenarios, LearnFromWinners). No blank screens or errors. Lazy-loaded content shows a spinner while loading. |           |       |

---

### SETTINGS (Configuration)

| #   | Scenario                   | Steps                                                                                                                                                                                     | Expected Result                                                                                                                                                                                                                                              | Pass/Fail | Notes |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ----- |
| 20  | Update Brand Profile       | 1. Click "Settings" in the header navigation. 2. The "Brand Profile" section should be active by default. 3. Modify a brand field (e.g., company name, brand voice). 4. Save the changes. | Settings page loads (`/settings`). Left sidebar shows 5 sections: Brand Profile, Knowledge Base, API Keys, Strategy, Usage & Quotas. Brand Profile form is editable. Changes save successfully with a confirmation toast.                                    |           |       |
| 21  | Navigate Settings sections | 1. On Settings page, click "Knowledge Base" in the left sidebar. 2. Then click "API Keys". 3. Then click "Usage & Quotas".                                                                | Each section loads its content in the right panel. URL updates with the section parameter (e.g., `/settings?section=knowledge-base`). No blank screens. All sections render their respective content (KnowledgeBaseSection, ApiKeySettings, QuotaDashboard). |           |       |

---

### ERROR HANDLING & EDGE CASES

| #   | Scenario                          | Steps                                                                                                                       | Expected Result                                                                                                                                                                     | Pass/Fail | Notes |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----- |
| 22  | Generate with no product selected | 1. On Studio, clear any selected products. 2. Type a prompt. 3. Attempt to click "Generate".                                | Generate button is either disabled or clicking it shows a validation message/toast indicating that at least one product must be selected. No server error occurs.                   |           |       |
| 23  | Navigate to invalid route         | 1. Manually type a non-existent URL in the browser, e.g., `/this-does-not-exist`.                                           | The NotFound page renders with a helpful message and option to navigate back. No white screen or unhandled error.                                                                   |           |       |
| 24  | Legacy route redirects            | 1. Navigate to `/content-planner`. 2. Navigate to `/approval-queue`. 3. Navigate to `/products`. 4. Navigate to `/usage`.   | Each legacy route redirects to its new location: `/pipeline?tab=planner`, `/pipeline?tab=approval`, `/library?tab=products`, `/settings?section=usage` respectively. No 404 errors. |           |       |
| 25  | Theme toggle (dark/light)         | 1. Click the theme toggle button in the header (sun/moon icon). 2. Toggle between dark and light mode. 3. Refresh the page. | Theme switches immediately. All page elements (backgrounds, text, borders, cards) adapt correctly. Theme preference persists after refresh via localStorage.                        |           |       |

---

## Summary

| Category       | Scenario Count | Passed | Failed |
| -------------- | -------------- | ------ | ------ |
| AUTH           | 5              |        |        |
| STUDIO         | 6              |        |        |
| GALLERY        | 3              |        |        |
| PIPELINE       | 3              |        |        |
| LIBRARY        | 2              |        |        |
| SETTINGS       | 2              |        |        |
| ERROR HANDLING | 4              |        |        |
| **TOTAL**      | **25**         |        |        |

---

## Sign-Off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| Tester        |      |      |           |
| Product Owner |      |      |           |
