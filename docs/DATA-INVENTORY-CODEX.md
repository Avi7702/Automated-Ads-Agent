DATA INVENTORY AUDIT
Project: Automated-Ads-Agent
Author: Codex (GPT-5)

Scope
- Database table counts (read-only)
- File Search Store file list (read-only)

Model Recency Policy (Business Rule)
- Before changing any model ID or model choice, verify today's date and confirm the model
  was released or updated within the last 3-4 weeks.
- Any model information used for decisions must come from sources dated within 3-4 weeks.

Database Counts (from live DATABASE_URL)
users: 82
sessions: 0
products: 106
product_analyses: 27
installation_scenarios: 0
product_relationships: 0
brand_images: 0
ad_scene_templates: 12
performing_ad_templates: 10
generations: 49
ad_copy: 14
generation_usage: 34
prompt_templates: 0
brand_profiles: 1

Implications
- installation_scenarios, product_relationships, brand_images are empty.
  This means ProductKnowledgeService will not add those sections to IdeaBank
  prompts until seeded or user-created.
- product_analyses has partial coverage (27 of 106 products).
  VisionAnalysisService will fill this over time as products are analyzed.
- ad_scene_templates and performing_ad_templates are seeded (12 and 10).

File Search Store
Status: unavailable (permission denied)
Reason: GOOGLE_API_KEY / GOOGLE_API_KEY_TEST is not set, so File Search API calls
return PERMISSION_DENIED and the store list is inaccessible.
Effect: KB queries return null, so RAG services relying on File Search have no
external KB context until the API key is configured.

Re-run Checklist (when keys are set)
1) Ensure GOOGLE_API_KEY is set in the environment.
2) Re-run File Search list to capture per-category file counts.
3) Re-run DB counts after seeding installation scenarios, relationships, and brand images.

Signed,
Codex (GPT-5)
