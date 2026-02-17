/* eslint-disable no-console */
/**
 * Temporary debugging script to fetch recent errors
 * Run with: npx tsx server/debug-errors.ts
 */

import 'dotenv/config';
import { db } from './db';
import { generations } from '../shared/schema';
import { desc } from 'drizzle-orm';

async function findFailedGenerations() {
  console.log('Checking for failed or non-completed generations...\n');

  try {
    // Get recent generations with any status
    const recentGens = await db
      .select({
        id: generations.id,
        status: generations.status,
        prompt: generations.prompt,
        createdAt: generations.createdAt,
        model: generations.model,
      })
      .from(generations)
      .orderBy(desc(generations.createdAt))
      .limit(20);

    console.log(`Found ${recentGens.length} recent generations:\n`);

    recentGens.forEach((gen, idx) => {
      console.log(`${idx + 1}. ID: ${gen.id}`);
      console.log(`   Status: ${gen.status}`);
      console.log(`   Created: ${gen.createdAt}`);
      console.log(`   Prompt: ${gen.prompt?.substring(0, 80)}...`);
      console.log(`   Model: ${gen.model || 'N/A'}`);
      console.log('');
    });

    // Check for any non-completed status
    const failedGens = recentGens.filter((g) => g.status !== 'completed');
    if (failedGens.length > 0) {
      console.log(`\n⚠️  Found ${failedGens.length} non-completed generations:`);
      failedGens.forEach((gen) => {
        console.log(`   - ${gen.id}: ${gen.status}`);
      });
    } else {
      console.log('\n✅ All recent generations have status "completed"');
      console.log('   This means any failures did not save to the database.');
      console.log('   Check server logs or monitoring dashboard for error details.');
    }
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    process.exit(0);
  }
}

findFailedGenerations();
