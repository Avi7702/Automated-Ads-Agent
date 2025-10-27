#!/usr/bin/env node
/**
 * Quick MCP smoke test runner.
 * Requires environment variables for any tools you plan to exercise.
 */

import { handleMCP } from '../src/handler.js';

const toolCalls = [
  {
    name: 'generate_hero_image',
    arguments: {
      prompt:
        process.env.SMOKE_PROMPT ??
        'Hero shot of galvanized steel beams stacked in a warehouse',
      cache: false,
    },
    description: 'Cloudinary hero image generator',
  },
  {
    name: 'query_products',
    arguments: { query: 'T12', limit: 1 },
    description: 'Supabase product lookup',
  },
  {
    name: 'send_whatsapp_preview',
    arguments: {
      to: process.env.SMOKE_TWILIO_TEST_TO ?? '+0000000000',
      body: 'MCP smoke test preview',
    },
    description: 'Twilio WhatsApp preview (requires provisioned sender)',
    optional: true,
  },
];

async function run() {
  for (const call of toolCalls) {
    try {
      const response = await handleMCP({
        method: 'tools.call',
        params: { name: call.name, arguments: call.arguments },
        id: call.name,
      });
      console.log(`\n=== ${call.description} (${call.name}) ===`);
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error(`\n=== ${call.description} (${call.name}) FAILED ===`);
      if (call.optional) {
        console.error(
          `Optional test failed: ${error.message}. Ensure credentials are configured.`,
        );
      } else {
        throw error;
      }
    }
  }
}

run().catch((err) => {
  console.error('\nSmoke test aborted:', err);
  process.exit(1);
});
