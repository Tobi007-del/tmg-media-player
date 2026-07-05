import { uid as _uid } from "@t007/utils";
import { LUID_KEY } from "@consts/generics";

// Case Conversion
export { capitalize, camelize, uncamelize } from "@t007/utils";

// Generation
export const uid = (prefix = "tmg_") => _uid(prefix);

export function luid(key = LUID_KEY, prefix = "tmg_local_"): string {
  let id = localStorage.getItem(key);
  return !id && localStorage.setItem(key, (id = uid(prefix))), id || "";
}

// Parsers
export { remToPx, pxToRem, parseCSSTime, parseCSSSize } from "@t007/utils";

// Checkers
export { cleanURL, isSameURL } from "@t007/utils";

// Fuzzy String Matching
export function getSimilarity(target: string, spoken: string): number {
  if (target === spoken) return 1;
  if (target.length < 2 || spoken.length < 2) return 0;
  let matches = 0;
  for (let i = 0; i < target.length - 1; i++) {
    const bigram = target.substring(i, i + 2);
    if (spoken.includes(bigram)) matches++;
  }
  // console.log(`Fuzzy Match: ${target} vs ${spoken} = ${matches} / ${target.length - 1} = ${matches / (target.length - 1)}`);
  return matches / (target.length - 1); // Returns a score from 0.0 to 1.0 (e.g., 0.85 = 85% match)
}

export function fuzzyMatch(targets: string[], transcript: string, threshold: number): string | null {
  const tokens = transcript.split(/\s+/);
  for (const target of targets) {
    const targetBlob = target.replace(/[-\s]/g, "");
    for (let i = 0; i < tokens.length; i++) {
      let rawChunk = "",
        chunkBlob = "";
      // Group words together to check multi-word phrases
      for (let j = i; j < tokens.length; j++) {
        rawChunk += (j === i ? "" : " ") + tokens[j]; // The exact string with spaces
        chunkBlob += tokens[j]; // The squashed string for math
        if (chunkBlob === targetBlob || getSimilarity(targetBlob, chunkBlob) >= threshold) return rawChunk; // Returns exactly what was spoken (e.g., "six seven")
      }
    }
  }
  return null;
}
