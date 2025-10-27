#!/usr/bin/env node

const { Client } = require('pg');

const DEFAULT_CONFIG = {
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres',
    password: 'EyfCGEAUJ1Kkkivjas',
    ssl: { rejectUnauthorized: false },
};

const connectionConfig = process.env.SUPABASE_DATABASE_URL
    ? {
          connectionString: process.env.SUPABASE_DATABASE_URL,
          ssl: { rejectUnauthorized: false },
      }
    : DEFAULT_CONFIG;

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.image_cache (
  cache_key text PRIMARY KEY,
  prompt text,
  style text,
  size text,
  format text,
  public_id text,
  secure_url text,
  provider text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
`;

async function main() {
    const client = new Client(connectionConfig);
    await client.connect();
    await client.query(CREATE_TABLE_SQL);
    await client.end();
    console.log('image_cache ensured');
}

main().catch((error) => {
    console.error('Failed to create image_cache table:', error);
    process.exit(1);
});
