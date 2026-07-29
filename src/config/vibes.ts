/**
 * Vibe synonyms.
 *
 * Users and venues describe the same thing with different words. A group asks
 * for a "rooftop"; the venue's own copy says "fourteenth-floor terrace". Both
 * are right, and a matcher that only does substring equality silently drops the
 * single most relevant venue in the city — which is exactly what it did before
 * this table existed.
 *
 * Data, not code, so the vocabulary grows without a deploy. In production this
 * becomes an embedding lookup; the shape of the call site does not change.
 */
export const VIBE_SYNONYMS: Record<string, string[]> = {
  Rooftop: [
    "rooftop",
    "roof top",
    "terrace",
    "open-air",
    "open air",
    "outdoor",
    "skyline",
    "alfresco",
  ],
  "Low-key": [
    "low-key",
    "lowkey",
    "relaxed",
    "chilled",
    "chill",
    "quiet",
    "conversation",
    "listening",
    "intimate",
    "seated",
  ],
  "High energy": [
    "high energy",
    "loud",
    "packed",
    "wild",
    "peak",
    "chaotic",
    "throughput",
  ],
  Dancefloor: ["dancefloor", "dance floor", "dancing", "floor"],
  Underground: [
    "underground",
    "warehouse",
    "basement",
    "raw",
    "industrial",
    "concrete",
  ],
  Upscale: [
    "upscale",
    "premium",
    "luxury",
    "classy",
    "vip",
    "bottle service",
    "smart casual",
  ],
  "Live music": ["live", "band", "percussion", "musicians", "horn"],
  Techno: ["techno", "minimal", "acid", "hard groove"],
  House: ["house", "deep house", "tech house", "organic house"],
  "Deep House": ["deep house", "house"],
  "Afro House": ["afro house", "afro", "organic house"],
  "Hip-Hop": ["hip-hop", "hip hop", "rap", "r&b"],
  "R&B": ["r&b", "rnb", "soul"],
  Bollywood: ["bollywood", "desi", "commercial"],
  Commercial: ["commercial", "pop", "chart"],
  Jazz: ["jazz", "soul", "broken beat", "vinyl"],
  Disco: ["disco", "nu-disco", "nu disco", "funk"],
};

/** Every string that should count as evidence for a vibe, lowercased. */
export const vibeTerms = (vibe: string): string[] => {
  const canonical = vibe.toLowerCase();
  const synonyms = VIBE_SYNONYMS[vibe]?.map((s) => s.toLowerCase()) ?? [];
  return Array.from(new Set([canonical, ...synonyms]));
};
