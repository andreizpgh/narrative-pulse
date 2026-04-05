// ============================================================
// Narrative Heuristic — Token→Sector classifier fallback
// When no token_sectors are available from netflow/holdings,
// this heuristic classifies tokens by symbol patterns into
// Nansen-compatible sector names.
//
// Returns [] for unknown tokens — better to show "—" than
// to misclassify.
// ============================================================

// ============================================================
// Known token sets (exact symbol matches, uppercase)
// ============================================================

const AI_TOKENS = new Set([
  // Core AI tokens
  "FET", "AGIX", "OCEAN", "RNDR", "AKT", "TAO",
  "BITTENSOR", "FETCH", "SINGULARITY", "RENDER", "AKASH",
  // AI-adjacent with strong AI narrative
  "NEAR", "ICP",
]);

const AI_KEYWORDS = ["GPT", "LLM", "NEURAL", "COGNITIVE", "DEEP", "MACHINE"];

const MEMECOIN_TOKENS = new Set([
  // Top memecoins
  "PEPE", "DOGE", "SHIB", "FLOKI", "BONK", "WIF", "MOG", "BRETT",
  "MEME", "PONKE", "POPCAT", "MOCHI", "NEIRO", "FRED", "TURBO",
  "DOGECOIN", "SHIBA", "FLOKICEO", "BOME", "WEN", "MYRO", "SILLY",
  "TOSHI", "BODHI", "PIP", "NFD", "TREMP", "FIGHT", "BABYDOGE",
  "ELON", "DOGELON", "SAMO", "JOE", "GIGA", "MOODENG", "PNUT",
  "FWT", "CHILLGUY", "HARRY", "SPODO", "MANEKI", "RETARDIO",
  "ANDY", "WOLF", "LAND", "IGUANA", "BILLY", "CHIP", "GUMMY",
  "PUFFER", "NIBBLE", "BUCK", "PUMP", "DEGEN",
  // Additional common memecoins
  "HOGE", "SAFEMOON", "ELONDOGE", "KISHU", "JINDO",
  "HOSKY", "LEASH", "BONE", "DOGLE", "WOJAK", "SPX",
]);

const DEFI_TOKENS = new Set([
  "UNI", "AAVE", "COMP", "CRV", "MKR", "DYDX", "SNX", "BAL",
  "SUSHI", "YFI", "1INCH", "LDO", "RPL", "GMX", "JOE", "PENDLE",
  "AERO", "VEL", "CAM", "THOR", "JUP", "RAY", "ORCA", "MNGO",
  "PROJ", "KAMINO", "MARGINFI",
]);

const GAMEFI_TOKENS = new Set([
  "GALA", "AXS", "IMX", "RON", "SAND", "MANA", "ENJ", "ALICE",
  "SLP", "PIXEL", "PORTAL", "XAI", "STRK", "READY", "YGG", "MCS",
]);

const GAMEFI_KEYWORDS = ["GAME", "PLAY", "QUEST", "LOOT"];

const DEPIN_TOKENS = new Set([
  "HNT", "MOBILE", "IOT", "FIL", "AR", "GRASS", "GEOD", "DIMO", "HONEY",
]);

const RWA_TOKENS = new Set([
  "ONDO", "TRU", "CFG", "POLYX", "DUSK", "TOKEN", "LANDSHARE", "PROPC",
]);

const INFRASTRUCTURE_TOKENS = new Set([
  // L1/L2 native tokens
  "ETH", "SOL", "BNB", "ARB", "OP", "MATIC", "AVAX", "BASE",
  "ATOM", "DOT", "SUI", "SEI", "INJ", "TIA", "MANTA", "BLAST", "LINEA",
  // Infrastructure/utility
  "LINK", "GRT", "API3", "BAND", "PYTH", "CHAINLINK", "THEGRAPH",
  // Additional infra
  "FTM", "NEAR", "APT", "MOVE", "CELO",
]);

// ============================================================
// Suffix/prefix patterns for meme detection
// ============================================================

const MEMECOIN_SUFFIXES = ["COIN", "INU", "MOON", "ROCKET"];
const MEMECOIN_PREFIXES: string[] = []; // None needed currently

// ============================================================
// Helper: check if symbol contains an AI keyword as a distinct token
// e.g., "GPT4" contains "GPT" → true
// e.g., "OGPTRADE" contains "GPT" → true (preceded by non-alpha, followed by non-alpha? no...)
// We check if the keyword appears as a substring
// ============================================================

function containsKeyword(symbol: string, keywords: string[]): boolean {
  for (const kw of keywords) {
    if (symbol.includes(kw)) return true;
  }
  return false;
}

// ============================================================
// Helper: check if "AI" appears at the end of the symbol
// or as a distinct word (preceded by non-alpha character)
// Avoids false positives like BAI, HAI, FAIR, RAI, RAIDER
// ============================================================

function hasAiPattern(s: string): boolean {
  // "AI" at the end (e.g., AIFI, TOKENAI)
  if (s.endsWith("AI") && s.length > 3) return true;

  // "AI" as prefix (e.g., AISYS, AIBOT)
  if (s.startsWith("AI") && s.length > 3) return true;

  // "AI" preceded by a digit (e.g., V2AI, 4AI)
  const digitMatch = s.match(/\dAI/);
  if (digitMatch) return true;

  // "AI_" or "AI-" style separators — but we strip non-alphanum, so skip

  return false;
}

// ============================================================
// Main classifier
// ============================================================

/**
 * Classify a token symbol into Nansen-compatible sector names.
 * Returns an array with primary sector first (matching how
 * toNarrativeKey() uses sectors[0]).
 *
 * Returns [] for unknown tokens — no guessing.
 */
export function classifyByHeuristic(symbol: string): string[] {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return [];

  // --- Priority order matters: more specific categories first ---

  // 1. DePIN (infrastructure-like but specifically decentralized physical networks)
  //    RNDR/AKT overlap with AI — DePIN is more specific
  if (DEPIN_TOKENS.has(s)) {
    return ["DePIN"];
  }

  // 2. AI / Artificial Intelligence
  if (AI_TOKENS.has(s) || hasAiPattern(s) || containsKeyword(s, AI_KEYWORDS)) {
    return ["Artificial Intelligence"];
  }

  // 3. Memecoins (known set + suffix patterns)
  if (MEMECOIN_TOKENS.has(s)) {
    return ["Memecoins"];
  }
  // Check meme suffixes (e.g., DOGE**COIN**, SHIBA**INU**)
  for (const suffix of MEMECOIN_SUFFIXES) {
    if (s.endsWith(suffix) && s.length > suffix.length) {
      return ["Memecoins"];
    }
  }
  for (const prefix of MEMECOIN_PREFIXES) {
    if (s.startsWith(prefix) && s.length > prefix.length) {
      return ["Memecoins"];
    }
  }

  // 4. RWA (real-world assets — small, specific set)
  if (RWA_TOKENS.has(s)) {
    return ["RWA"];
  }

  // 5. GameFi
  if (GAMEFI_TOKENS.has(s) || containsKeyword(s, GAMEFI_KEYWORDS)) {
    return ["GameFi"];
  }

  // 6. DeFi (protocols, DEXes, lending, governance)
  if (DEFI_TOKENS.has(s)) {
    return ["DeFi"];
  }

  // 7. Infrastructure (L1/L2, oracles, bridges)
  if (INFRASTRUCTURE_TOKENS.has(s)) {
    return ["Infrastructure"];
  }

  // Unknown — return empty rather than guess
  return [];
}
