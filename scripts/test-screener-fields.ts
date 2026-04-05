// scripts/test-screener-fields.ts
// Minimal test: does Nansen token-screener return token_sectors?
// Cost: ~10 credits (1 page, 10 entries)

import { nansenPost } from '../src/api/client.js';
import type { TokenScreenerEntry } from '../src/types.js';

async function main() {
  console.log('=== Nansen Token-Screener Field Test ===');
  console.log('Checking if token_sectors is returned...\n');

  const response = await nansenPost<TokenScreenerEntry[]>(
    '/token-screener',
    {
      chains: ['ethereum', 'solana', 'base', 'bnb', 'arbitrum'],
      timeframe: '24h',
      pagination: { page: 1, per_page: 10 },
      order_by: [{ field: 'netflow', direction: 'DESC' }],
    }
  );

  console.log(`Credits used: ${response.creditsUsed}`);
  console.log(`Credits remaining: ${response.creditsRemaining}`);
  console.log(`Entries returned: ${response.data.length}\n`);

  if (response.data.length === 0) {
    console.log('No data returned.');
    return;
  }

  // Show ALL raw keys of the first entry
  const firstEntry = response.data[0] as Record<string, unknown>;
  console.log('=== ALL FIELDS on first entry ===');
  for (const [key, value] of Object.entries(firstEntry)) {
    const type = Array.isArray(value) ? `array[${(value as unknown[]).length}]` : typeof value;
    console.log(`  ${key}: ${type} = ${JSON.stringify(value)?.substring(0, 100)}`);
  }

  // Check token_sectors specifically
  console.log('\n=== TOKEN_SECTORS CHECK ===');
  let sectorsCount = 0;
  for (let i = 0; i < response.data.length; i++) {
    const entry = response.data[i] as Record<string, unknown>;
    const sectors = entry.token_sectors;
    if (sectors && Array.isArray(sectors) && sectors.length > 0) {
      sectorsCount++;
      console.log(`  [${i}] ${entry.token_symbol}: ${JSON.stringify(sectors)}`);
    } else {
      console.log(`  [${i}] ${entry.token_symbol}: NO token_sectors`);
    }
  }
  console.log(`\nResult: ${sectorsCount}/${response.data.length} entries have token_sectors`);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
