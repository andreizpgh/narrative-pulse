# Nansen API — Field Research Results

> **Date**: 2026-04-05
> **Credits spent on this test**: 10
> **Credits remaining**: 6870

## Test: Does token-screener return `token_sectors`?

**Script**: `scripts/test-screener-fields.ts`
**Command**: `npx tsx scripts/test-screener-fields.ts`
**Cost**: 10 credits (1 page, 10 entries)

### Result: ❌ NO — token_sectors is NOT returned

**0/10 entries** have `token_sectors` in the token-screener response.

### All fields returned by token-screener (first entry)

```
chain: string
token_address: string
token_age_days: number
market_cap_usd: number
liquidity: number
price_usd: number
price_change: number          // decimal fraction: 0.01 = 1%
fdv: number
fdv_mc_ratio: number
buy_volume: number
inflow_fdv_ratio: number
outflow_fdv_ratio: number
sell_volume: number
volume: number
netflow: number
```

### Fields NOT returned (confirmed absent)
- `token_sectors` — ❌ NOT PRESENT
- `token_symbol` — ✅ PRESENT
- `nof_buyers` — ❌ NOT PRESENT
- `nof_sellers` — ❌ NOT PRESENT

### Top-10 screener entries (by netflow DESC)
All are stablecoins/wrapped tokens: USDC, 🌱 WHATSAPP, DAI, SYRUPUSDC, USDC, CASH, PIPPIN, JUPSOL, (empty symbol), ODIC

This confirms that stablecoins dominate the screener by volume/netflow — they MUST be filtered out for meaningful highlights.

## Implications for P0-01 (Narrative Column)

Since `token_sectors` is NOT in screener, the ONLY sources for narrative/sector data are:
1. **Netflow endpoint** (100 entries with token_sectors)
2. **Holdings endpoint** (50 entries with token_sectors)

Fix strategy (confirmed):
1. Add **symbol-only matching** in `screener-highlights.ts` — catches cross-chain matches (token on ETH in netflow, SOL in screener)
2. Add **symbol-only matching** in `scanner.ts` for holdings cross-reference
3. Consider increasing netflow pages from 2→3 (+50 credits) for better coverage
4. Consider increasing holdings pages from 1→2 (+50 credits) for better coverage

## Endpoint Credit Costs (confirmed)

| Endpoint | Credits/page | Confirmed |
|----------|-------------|-----------|
| token-screener | 10 | ✅ (this test) |
| smart-money/netflow | 50 | ✅ (previous tests) |
| smart-money/holdings | 50 | ✅ (previous tests) |
| tgm/flow-intelligence | 10 | ✅ (previous tests) |
| agent/fast | 2000 | ✅ (previous tests) |
