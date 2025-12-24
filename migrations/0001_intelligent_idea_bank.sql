-- Migration: Intelligent Idea Bank Tables
-- Created: 2025-12-24
-- Description: Adds ad_scene_templates, brand_profiles, and product_analyses tables

-- ============================================
-- AD SCENE TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS ad_scene_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,

  -- Preview image (required for template browsing)
  preview_image_url TEXT NOT NULL,
  preview_public_id TEXT NOT NULL,

  -- Reference images for exact_insert mode (optional, up to 5)
  reference_images JSONB,

  -- Categorization
  category VARCHAR(50) NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::text[],

  -- Platform targeting hints
  platform_hints TEXT[],
  aspect_ratio_hints TEXT[],

  -- Prompt engineering
  prompt_blueprint TEXT NOT NULL,
  placement_hints JSONB,
  lighting_style VARCHAR(50),

  -- Extended metadata for matching
  intent VARCHAR(50),
  environment VARCHAR(50),
  mood VARCHAR(50),
  best_for_product_types TEXT[],

  -- Access control
  is_global BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- BRAND PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS brand_profiles (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Brand identity
  brand_name TEXT,
  industry VARCHAR(100),
  brand_values TEXT[],

  -- Target audience (enhanced)
  target_audience JSONB,

  -- Visual preferences
  preferred_styles TEXT[],
  color_preferences TEXT[],

  -- Voice (syncs with users.brand_voice)
  voice JSONB,

  -- KB integration
  kb_tags TEXT[],

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- PRODUCT ANALYSES
-- ============================================
CREATE TABLE IF NOT EXISTS product_analyses (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(255) NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,

  -- Cache key
  image_fingerprint TEXT NOT NULL,

  -- Vision analysis results
  category VARCHAR(100),
  subcategory VARCHAR(100),
  materials TEXT[],
  colors TEXT[],
  style VARCHAR(50),
  usage_context TEXT,
  target_demographic TEXT,
  detected_text TEXT,

  -- Analysis metadata
  confidence INTEGER DEFAULT 80,
  model_version VARCHAR(50),
  analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- GENERATION USAGE (Cost tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS generation_usage (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id VARCHAR(255) NOT NULL UNIQUE REFERENCES generations(id) ON DELETE CASCADE,

  brand_id VARCHAR(255) NOT NULL,
  model TEXT NOT NULL,
  operation VARCHAR(20) NOT NULL,
  resolution VARCHAR(10) NOT NULL,

  input_images_count INTEGER NOT NULL,
  prompt_chars INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,

  input_tokens INTEGER,
  output_tokens INTEGER,

  estimated_cost_micros INTEGER NOT NULL,
  estimation_source VARCHAR(20) NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ad_scene_templates_category ON ad_scene_templates(category);
CREATE INDEX IF NOT EXISTS idx_ad_scene_templates_is_global ON ad_scene_templates(is_global);
CREATE INDEX IF NOT EXISTS idx_brand_profiles_user_id ON brand_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_product_analyses_product_id ON product_analyses(product_id);
CREATE INDEX IF NOT EXISTS idx_generation_usage_brand_id ON generation_usage(brand_id);
CREATE INDEX IF NOT EXISTS idx_generation_usage_created_at ON generation_usage(created_at);
