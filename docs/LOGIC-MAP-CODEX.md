LOGIC MAP REPORT (TEXT + MIND GRAPH)
Project: Automated-Ads-Agent
Author: Codex (GPT-5)

Purpose
This document describes the actual, implemented logic of the system: how each component
creates verified, brand-grounded context so non-technical users can request ads without
needing to supply technical details. The intent is to eliminate hallucination by feeding
precise, vetted data into the generation pipeline.

Model Recency Policy (Business Rule)
- Before changing any model ID or model choice, verify today's date and confirm the model
  was released or updated within the last 3-4 weeks.
- Any model information used for decisions must come from sources dated within 3-4 weeks.

Core Principles
1) Knowledge first: explicit, verified context beats model memory.
2) Brand grounding: brand profile and brand images constrain creative output.
3) Verified data flow: enrichment and RAG retrieval must converge into prompts.
4) Graceful fallback: when a source is missing, the system still produces output.

Mind Graph (ASCII)
USER
|-- UI
|   |-- Studio -> IdeaBank Panel -> /api/idea-bank/suggest
|   |-- Product Library -> /api/products + enrichment routes
|   |-- Brand Profile -> /api/brand-profile
|   |-- Brand Images -> /api/brand-images
|   |-- Templates -> /api/templates (ad_scene_templates)
|
|-- API
|   |-- Idea Bank
|   |   |-- IdeaBankService
|   |   |   |-- VisionAnalysisService -> product_analyses
|   |   |   |-- ProductKnowledgeService
|   |   |   |   |-- InstallationScenarios (DB)
|   |   |   |   |-- ProductRelationships (DB)
|   |   |   |   |-- BrandImages (DB)
|   |   |   |-- FileSearchService (KB)
|   |   |   |-- Ad Scene Template Matching (DB: ad_scene_templates)
|   |   |   |-- Gemini (text reasoning)
|   |-- Transform
|   |   |-- /api/transform
|   |   |-- Inject BrandProfile
|   |   |-- Optional ad_scene_template (exact_insert / inspiration)
|   |   |-- Gemini (image generation)
|   |-- Copywriting
|   |   |-- CopywritingService
|   |   |-- FileSearchService (KB ad_examples)
|   |   |-- Gemini (text, JSON)
|   |-- Enrichment
|       |-- ProductEnrichmentService (draft + human verify)
|       |-- VisionAnalysisService
|       |-- Gemini (text + grounding)
|
|-- RAG Services (Tools)
|   |-- InstallationScenarioRAG
|   |-- RelationshipDiscoveryRAG
|   |-- BrandImageRecommendationRAG
|   |-- TemplatePatternRAG
|
|-- Storage / Knowledge
    |-- PostgreSQL (products, analyses, scenarios, relationships, brand images, templates)
    |-- File Search Store (KB: brand_guidelines, ad_examples, product_catalog, etc.)

Component Logic and Relationships (Implemented)

1) IdeaBankService (AI Orchestrator)
Input: productId and/or uploaded image descriptions, userId, userGoal
Dependencies:
- VisionAnalysisService: runs or retrieves cached product_analyses.
- ProductKnowledgeService: aggregates DB knowledge (relationships, scenarios, brand images).
- FileSearchService: retrieves KB context (File Search store).
- Ad scene templates: matches ad_scene_templates by analysis attributes.
- BrandProfile: adds brand identity constraints.
Output: IdeaBank suggestions (prompt, mode, reasoning, confidence, recommended platform/ratio).
Relationship: central orchestrator used by /api/idea-bank/suggest; not directly calling the
four RAG services, but it consumes their data indirectly via ProductKnowledgeService or DB.

2) VisionAnalysisService
Input: product image (cloudinaryUrl)
Output: product_analyses (category, materials, style, usageContext, etc.)
Relationship: used by IdeaBankService and ProductEnrichmentService; cached in DB.

3) ProductKnowledgeService
Input: productId, userId
Output: EnhancedProductContext (formattedContext) built from DB tables:
- product_relationships
- installation_scenarios
- brand_images
Relationship: feeds IdeaBankService prompt context, making RAG results available even
when RAG services are not called directly.

4) FileSearchService (KB)
Input: query + optional category
Output: KB context + citations
Relationship: used by IdeaBankService (general KB context), RelationshipDiscoveryRAG
(category: product_relationships), InstallationScenarioRAG (installation_guides), and
CopywritingService (ad_examples). Requires API key; failure is non-fatal.

5) InstallationScenarioRAG
Input: productId, roomType, userId
Retrieval: FileSearchService (installation_guides) + installation_scenarios (DB)
Output: steps, accessories, tips, matching scenarios
Relationship: exposed as /api/installation/* endpoints; not called by IdeaBankService
in current wiring, but its DB table is used by ProductKnowledgeService.

6) RelationshipDiscoveryRAG
Input: productId, userId
Retrieval: FileSearchService (product_relationships) + product_analyses + products (DB)
Output: relationship suggestions + optional auto-create
Relationship: exposed as /api/relationships/* endpoints; ProductKnowledgeService
reads existing relationships from DB.

7) BrandImageRecommendationRAG
Input: productIds, useCase, platform, mood, userId
Retrieval: brand_images (DB) + product_analyses (DB) + heuristic scoring
Output: ranked brand image recommendations
Relationship: exposed as /api/brand-images/* endpoints; ProductKnowledgeService uses
brand_images directly, but IdeaBankService does not call this RAG directly.

8) TemplatePatternRAG
Input: industry, objective, platform, aspectRatio, mood, style, userId
Retrieval: performing_ad_templates (DB) + Gemini vision analysis
Output: template matches + customization suggestions
Relationship: exposed as /api/templates/* endpoints (template_pattern routes); separate
from ad_scene_templates used in generation.

9) /api/transform (Image Generation)
Input: prompt + optional templateId + files
Dependencies:
- ad_scene_templates (for exact_insert or inspiration)
- brand_profiles (inject brand guidelines)
- Gemini image generation
Output: generated image + usage tracking
Relationship: does not currently consume BrandImageRecommendationRAG results.

10) CopywritingService
Input: generation + product details + platform + brand voice
Dependencies: FileSearchService (ad_examples)
Output: ad_copy records in DB
Relationship: independent of IdeaBankService, but shares the same KB.

11) ProductEnrichmentService
Input: productId, userId
Dependencies: VisionAnalysisService + Gemini grounding + human verification
Output: enrichment draft -> verified product metadata
Relationship: feeds ProductKnowledgeService and RelationshipDiscoveryRAG by improving
product data quality.

Data Dependencies (What must be populated)
- products: core product catalog and images
- product_analyses: vision analysis cache (auto-generated)
- installation_scenarios: installation context (seed or user-created)
- product_relationships: accessory/compatibility mapping
- brand_images: brand-owned images with categories/tags
- ad_scene_templates: generation templates
- performing_ad_templates: high-performing layout library
- brand_profiles: brand identity and visual preferences
- File Search store: brand_guidelines, ad_examples, product_catalog, installation_guides, etc.

System Behavior if Data is Missing
- IdeaBankService still works but loses precision:
  - missing analyses -> weaker matching
  - missing relationships/scenarios/brand images -> less grounded prompts
  - missing File Search store -> no KB context
- RAG endpoints return empty or low-confidence outputs if their data stores are empty.

Signed,
Codex (GPT-5)
