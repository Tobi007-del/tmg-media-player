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

export function formatMenuPx(v: string | number, long = false): string {
  const num = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(num) ? `0${long ? " px" : "px"}` : `${Math.round(num)}${long ? " px" : "px"}`;
}

// Checkers
export { cleanURL, isSameURL } from "@t007/utils";

// Fuzzy String Matching
export function getBigRamSimilarity(target: string, spoken: string): number {
  if (target === spoken) return 1;
  if (target.length < 2 || spoken.length < 2) return 0;
  let matches = 0;
  for (let i = 0; i < target.length - 1; i++) {
    const bigram = target.substring(i, i + 2);
    if (spoken.includes(bigram)) matches++;
  } // console.log(`Fuzzy Match: ${target} vs ${spoken} = ${matches} / ${target.length - 1} = ${matches / (target.length - 1)}`);
  return matches / (target.length - 1); // Returns a score from 0.0 to 1.0 (e.g., 0.85 = 85% match)
} // For clumpsy fingers

export function getLevenshteinSimilarity(target: string, spoken: string): number {
  if (target === spoken) return 1;
  const tLen = target.length,
    sLen = spoken.length;
  if (!tLen || !sLen) return 0;
  let prev = Array.from({ length: sLen + 1 }, (_, j) => j);
  for (let i = 0; i < tLen; i++) {
    const curr = [i + 1];
    for (let j = 0; j < sLen; j++) {
      curr[j + 1] = Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + (target[i] === spoken[j] ? 0 : 1));
    }
    prev = curr;
  } // console.log(`Fuzzy Match: ${target} vs ${spoken} = ${prev[sLen]} / ${Math.max(tLen, sLen)} = ${1 - prev[sLen] / Math.max(tLen, sLen)}`);
  return 1 - prev[sLen] / Math.max(tLen, sLen);
} // For missy voice

export function fuzzyBlobMatch(targets: string[], transcript: string, threshold: number): string | null {
  const chunkBlob = transcript.replace(/[-\s]/g, "");
  for (const target of targets) {
    const targetBlob = target.replace(/[-\s]/g, "");
    if (chunkBlob === targetBlob || (Math.abs(chunkBlob.length - targetBlob.length) <= Math.max(chunkBlob.length, targetBlob.length) * (1 - threshold) && getLevenshteinSimilarity(targetBlob, chunkBlob) >= threshold)) return transcript; // skip levenshtein math if diff is too large to ever pass the threshold
  }
  return null;
}

export function fuzzyChunkMatch(targets: string[], transcript: string, threshold: number): string | null {
  const tokens = transcript.split(/\s+/);
  for (const target of targets) {
    const targetBlob = target.replace(/[-\s]/g, "");
    for (let i = 0, tlen = tokens.length; i < tlen; i++) {
      let rawChunk = "", // The exact string with spaces
        chunkBlob = ""; // The squashed string for math
      for (let j = i; j < tlen; j++) {
        rawChunk += (j === i ? "" : " ") + (chunkBlob += tokens[j]);
        if (chunkBlob === targetBlob || (Math.abs(chunkBlob.length - targetBlob.length) <= Math.max(chunkBlob.length, targetBlob.length) * (1 - threshold) && getLevenshteinSimilarity(targetBlob, chunkBlob) >= threshold)) return rawChunk; // Returns exactly what was spoken (e.g., "six seven")
      } // Group words together to check multi-word phrases
    }
  }
  return null;
}
