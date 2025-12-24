-- Migration: Add copywriting tables and security fields
-- Phase 4: AI Ad Copywriting System

-- Add security fields to users table (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_voice JSONB;

-- Create sessions table for secure session management
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create ad_copy table for storing generated ad copy
CREATE TABLE IF NOT EXISTS ad_copy (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id VARCHAR NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Core copy fields
  headline TEXT NOT NULL,
  hook TEXT NOT NULL,
  body_text TEXT NOT NULL,
  cta TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT[] NOT NULL,
  
  -- Platform and style
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
  
  -- Additional context
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_copy_generation_id ON ad_copy(generation_id);
CREATE INDEX IF NOT EXISTS idx_ad_copy_user_id ON ad_copy(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_copy_parent_copy_id ON ad_copy(parent_copy_id);
CREATE INDEX IF NOT EXISTS idx_ad_copy_created_at ON ad_copy(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Add comments for documentation
COMMENT ON TABLE ad_copy IS 'Stores AI-generated ad copy for product images';
COMMENT ON TABLE sessions IS 'Secure session management for user authentication';
COMMENT ON COLUMN users.brand_voice IS 'User brand voice settings for consistent copy generation';
COMMENT ON COLUMN users.failed_attempts IS 'Count of failed login attempts for account lockout';
COMMENT ON COLUMN users.locked_until IS 'Account lockout expiration time';
