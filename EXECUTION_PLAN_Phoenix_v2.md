# Project Phoenix v2: Granular Execution Plan

**Author:** Manus AI
**Date:** Mar 07, 2026
**Version:** 1.0

---

This document breaks down the high-level Project Phoenix v2 proposal into a granular, trackable execution plan. It is designed to ensure no component is missed and that every step is executed to a production-quality standard.

**Total Components Tracked:**

| Category                | Count    |
| ----------------------- | -------- |
| API Route Files         | 35       |
| Server Services         | 55       |
| Database Tables         | 47       |
| Background Jobs         | 5        |
| Client Hooks            | 31       |
| Major UI Components     | 40+      |
| Test Files              | 140      |
| E2E Test Files          | 77       |
| **Total Tracked Items** | **430+** |

---

## Phase 1: The Unified Context & Quality Pipeline (24 Tasks)

- **Goal:** Consolidate all context and quality control into a single, robust pipeline.
- **Acceptance Criteria:** All AI generations (image, video, copy) are routed through the new pipeline. The pipeline correctly assembles all 8 context sources and executes all 4 quality gates. Existing tests for all preserved services must pass.

| ID   | Task                                                                     | Component(s)                                                      | Status      |
| ---- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- | ----------- |
| 1.01 | Create `UnifiedContextQualityPipeline.ts` service file                   | `server/services/`                                                | Not Started |
| 1.02 | Implement Context Assembly: User Prompt                                  | `UnifiedContextQualityPipeline.ts`                                | Not Started |
| 1.03 | Implement Context Assembly: Brand Context                                | `UnifiedContextQualityPipeline.ts`, `brandProfiles` table         | Not Started |
| 1.04 | Implement Context Assembly: Product Context                              | `UnifiedContextQualityPipeline.ts`, `productKnowledgeService.ts`  | Not Started |
| 1.05 | Implement Context Assembly: Learned Patterns                             | `UnifiedContextQualityPipeline.ts`, `patternExtractionService.ts` | Not Started |
| 1.06 | Implement Context Assembly: Knowledge Base (RAG)                         | `UnifiedContextQualityPipeline.ts`, `fileSearchService.ts`        | Not Started |
| 1.07 | Implement Context Assembly: Vision Analysis                              | `UnifiedContextQualityPipeline.ts`, `visionAnalysisService.ts`    | Not Started |
| 1.08 | Implement Context Assembly: Brand DNA                                    | `UnifiedContextQualityPipeline.ts`, `brandDNAService.ts`          | Not Started |
| 1.09 | Implement Context Assembly: Platform Guidelines                          | `UnifiedContextQualityPipeline.ts`, `platformSpecsService.ts`     | Not Started |
| 1.10 | Integrate Quality Gate: Pre-Generation Gate                              | `UnifiedContextQualityPipeline.ts`, `preGenGate.ts`               | Not Started |
| 1.11 | Integrate Quality Gate: Critic Stage                                     | `UnifiedContextQualityPipeline.ts`, `criticStage.ts`              | Not Started |
| 1.12 | Integrate Quality Gate: Content Safety                                   | `UnifiedContextQualityPipeline.ts`, `contentSafetyService.ts`     | Not Started |
| 1.13 | Integrate Quality Gate: Confidence Scoring                               | `UnifiedContextQualityPipeline.ts`, `confidenceScoringService.ts` | Not Started |
| 1.14 | Create unit tests for the complete pipeline                              | `UnifiedContextQualityPipeline.test.ts`                           | Not Started |
| 1.15 | Refactor `imageGenerationPipelineService.ts` to use the new pipeline     | `imageGenerationPipelineService.ts`                               | Not Started |
| 1.16 | Refactor `copywritingService.ts` to use the new pipeline                 | `copywritingService.ts`                                           | Not Started |
| 1.17 | Refactor `geminiVideoService.ts` to use the new pipeline                 | `geminiVideoService.ts`                                           | Not Started |
| 1.18 | Preserve & Verify: Auth System                                           | `authService.ts`, `tokenService.ts`, `encryptionService.ts`       | Not Started |
| 1.19 | Preserve & Verify: Quota Monitoring                                      | `quotaMonitoringService.ts`, `googleCloudMonitoringService.ts`    | Not Started |
| 1.20 | Preserve & Verify: Notification System                                   | `notificationService.ts`, `pushNotificationService.ts`            | Not Started |
| 1.21 | Preserve & Verify: Error Tracking                                        | `errorTrackingService.ts` (Sentry)                                | Not Started |
| 1.22 | Preserve & Verify: Background Jobs                                       | `tokenRefreshJob.ts`, `patternCleanupJob.ts`, `postingJob.ts`     | Not Started |
| 1.23 | Preserve & Verify: All 47 Database Tables                                | `shared/schema.ts`                                                | Not Started |
| 1.24 | **Phase 1 Review:** All tests passing, code reviewed, ready for Phase 2. | N/A                                                               | Not Started |

---

## Phase 2: The Autonomous Orchestrator & Core Playbooks (15 Tasks)

- **Goal:** Build the new orchestrator and the core playbooks for autonomous content creation.
- **Acceptance Criteria:** The new `OrchestratorService` can successfully execute all core playbooks. A/B testing framework is integrated. Video is a first-class output.

| ID   | Task                                                                     | Component(s)                                          | Status      |
| ---- | ------------------------------------------------------------------------ | ----------------------------------------------------- | ----------- |
| 2.01 | Create `OrchestratorService.ts` and Playbook interfaces                  | `server/services/`                                    | Not Started |
| 2.02 | Implement Playbook: `Generate_Single_Image_Post`                         | `OrchestratorService.ts`                              | Not Started |
| 2.03 | Implement Playbook: `Generate_Single_Video_Post`                         | `OrchestratorService.ts`                              | Not Started |
| 2.04 | Implement Playbook: `Generate_Carousel_Ad`                               | `OrchestratorService.ts`, `carouselOutlineService.ts` | Not Started |
| 2.05 | Implement Playbook: `Generate_Weekly_Plan` (autonomous)                  | `OrchestratorService.ts`, `weeklyPlannerService.ts`   | Not Started |
| 2.06 | Implement Playbook: `Run_AB_Test`                                        | `OrchestratorService.ts`                              | Not Started |
| 2.07 | Create new API routes for the orchestrator                               | `server/routes/orchestrator.router.ts`                | Not Started |
| 2.08 | Integrate `ExperimentService` into the orchestrator                      | `OrchestratorService.ts`, `experimentService.ts`      | Not Started |
| 2.09 | Create unit tests for the orchestrator and all playbooks                 | `OrchestratorService.test.ts`                         | Not Started |
| 2.10 | Deprecate the old `agentRunner.ts`                                       | `agentRunner.ts`                                      | Not Started |
| 2.11 | Preserve & Verify: Model Fine-Tuning                                     | `modelTrainingService.ts`, `training.router.ts`       | Not Started |
| 2.12 | Preserve & Verify: `productIntelligenceService.ts`                       | `productIntelligenceService.ts`                       | Not Started |
| 2.13 | Preserve & Verify: `ndsWebsiteScraper.ts`                                | `ndsWebsiteScraper.ts`                                | Not Started |
| 2.14 | Preserve & Verify: `relationshipDiscoveryRAG.ts`                         | `relationshipDiscoveryRAG.ts`                         | Not Started |
| 2.15 | **Phase 2 Review:** All tests passing, code reviewed, ready for Phase 3. | N/A                                                   | Not Started |

---

## Phase 3: The Unified Studio UI (18 Tasks)

- **Goal:** Overhaul the frontend to create a single, seamless user experience.
- **Acceptance Criteria:** The new Unified Studio is the primary user interface. All 10+ old pages are deprecated. All preserved UI capabilities are integrated.

| ID   | Task                                                                       | Component(s)                               | Status      |
| ---- | -------------------------------------------------------------------------- | ------------------------------------------ | ----------- |
| 3.01 | Create the new Unified `Studio.tsx` page                                   | `client/src/pages/`                        | Not Started |
| 3.02 | Integrate Product Selection into Studio                                    | `Studio.tsx`, `ProductLibrary.tsx`         | Not Started |
| 3.03 | Integrate Agent Chat into Studio                                           | `Studio.tsx`, `AgentChat` component        | Not Started |
| 3.04 | Integrate Generation Canvas into Studio                                    | `Studio.tsx`, `SmartCanvas` component      | Not Started |
| 3.05 | Integrate **Voice Input** into chat                                        | `useVoiceInput.ts`, `AgentChat`            | Not Started |
| 3.06 | Integrate **Canvas Editor** for post-generation edits                      | `Studio.tsx`, `CanvasEditor` component     | Not Started |
| 3.07 | Integrate **Style Reference System**                                       | `Studio.tsx`, `StyleReferenceSelector.tsx` | Not Started |
| 3.08 | Integrate **Brand Image Recommendation RAG**                               | `Studio.tsx`, `AssetDrawer`                | Not Started |
| 3.09 | Integrate **Real-Time Collaboration** features                             | `Studio.tsx`, `useCollaboration.ts`        | Not Started |
| 3.10 | Connect Studio UI to the new Orchestrator API                              | `useStudioGeneration.ts`                   | Not Started |
| 3.11 | Create the consolidated `Pipeline.tsx` page                                | `client/src/pages/`                        | Not Started |
| 3.12 | Create the consolidated `Library.tsx` page                                 | `client/src/pages/`                        | Not Started |
| 3.13 | Update navigation to reflect the new 4-page structure                      | `client/src/components/layout/`            | Not Started |
| 3.14 | Create E2E tests for the new Studio workflow                               | `e2e/studio.spec.ts`                       | Not Started |
| 3.15 | Preserve & Verify: `useCarouselBuilder.ts` hook                            | `useCarouselBuilder.ts`                    | Not Started |
| 3.16 | Preserve & Verify: `useWeeklyPlan.ts` hook                                 | `useWeeklyPlan.ts`                         | Not Started |
| 3.17 | Preserve & Verify: All 31 client hooks                                     | `client/src/hooks/`                        | Not Started |
| 3.18 | **Phase 3 Review:** All E2E tests passing, UI reviewed, ready for Phase 4. | N/A                                        | Not Started |

---

## Phase 4: Final Integration, Deprecation & Delivery (10 Tasks)

- **Goal:** Ensure all components work together flawlessly, remove all legacy code, and deliver the final product.
- **Acceptance Criteria:** The `claude/project-phoenix-v2` branch is merged to `main`. The deployed application is stable and fully functional. All 140 test files and 77 E2E tests are passing.

| ID   | Task                                                                       | Component(s)             | Status      |
| ---- | -------------------------------------------------------------------------- | ------------------------ | ----------- |
| 4.01 | Full end-to-end testing of all playbooks and UI flows                      | All                      | Not Started |
| 4.02 | Deprecate and remove old services (e.g., `agentRunner`)                    | `server/services/`       | Not Started |
| 4.03 | Deprecate and remove old UI pages (10+ pages)                              | `client/src/pages/`      | Not Started |
| 4.04 | Deprecate and remove old UI components                                     | `client/src/components/` | Not Started |
| 4.05 | Run a DB schema audit to ensure all 47 tables are used correctly           | `shared/schema.ts`       | Not Started |
| 4.06 | Update all project documentation (`README.md`, etc.)                       | `docs/`                  | Not Started |
| 4.07 | Perform final code review of the entire `claude/project-phoenix-v2` branch | All                      | Not Started |
| 4.08 | Create the final pull request to `main`                                    | GitHub                   | Not Started |
| 4.09 | Merge to `main` and monitor deployment                                     | Railway / CI/CD          | Not Started |
| 4.10 | **Project Complete:** Handover and final report.                           | N/A                      | Not Started |
