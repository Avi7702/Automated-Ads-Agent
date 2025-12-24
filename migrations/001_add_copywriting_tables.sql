-- Phase 4 Copywriting - Database Migration
-- Add adCopy table and brandVoice column to users table
-- Created: December 24, 2025

-- Add brandVoice column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_voice JSONB;

-- Create ad_copy table
CREATE TABLE IF NOT EXISTS ad_copy (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id VARCHAR NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Core copy components
  headline TEXT NOT NULL,
  hook TEXT NOT NULL,
  body_text TEXT NOT NULL,
  cta TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT[] NOT NULL,

  -- Platform and tone context
  platform VARCHAR(50) NOT NULL,
  tone VARCHAR(50) NOT NULL,
  framework VARCHAR(50),
  campaign_objective VARCHAR(50),

  -- Product context
  product_name TEXT NOT NULL,
  product_description TEXT NOT NULL,
  product_benefits TEXT[],
  unique_value_prop TEXT,
  industry VARCHAR(100) NOT NULL,

  -- Advanced context
  target_audience JSONB,
  brand_voice JSONB,
  social_proof JSONB,

  -- Quality metrics
  quality_score JSONB,
  character_counts JSONB,

  -- Variation tracking
  variation_number INTEGER DEFAULT 1,
  parent_copy_id VARCHAR,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ad_copy_generation_id ON ad_copy(generation_id);
CREATE INDEX IF NOT EXISTS idx_ad_copy_user_id ON ad_copy(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_copy_parent_copy_id ON ad_copy(parent_copy_id);
CREATE INDEX IF NOT EXISTS idx_ad_copy_created_at ON ad_copy(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE ad_copy IS 'Ad copywriting generated for image generations with multiple variations';
COMMENT ON COLUMN ad_copy.hook IS 'Opening hook (50-60 chars) - critical for attention grabbing';
COMMENT ON COLUMN ad_copy.framework IS 'Copywriting framework used: aida, pas, bab, fab';
COMMENT ON COLUMN ad_copy.quality_score IS 'AI self-assessment: clarity, persuasiveness, platformFit, brandAlignment, overallScore, reasoning';
COMMENT ON COLUMN ad_copy.character_counts IS 'Character counts for validation: headline, hook, body, caption, total';
COMMENT ON COLUMN ad_copy.variation_number IS 'Variation number for A/B testing (1-5)';
COMMENT ON COLUMN users.brand_voice IS 'User default brand voice: principles, wordsToAvoid, wordsToUse';
