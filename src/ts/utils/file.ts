import { NOOP } from "sia-reactor";
import { parseRomanNum } from "./num";
import { mimeTypes, VIDEO_EXTENSIONS } from "./match";

// File Size Formatting
export { formatSize } from "@t007/utils";

// Extension Helpers
export function getExtension(fn: string): string {
  return fn.slice(fn.lastIndexOf(".") + 1).toLowerCase() ?? "";
}

export function noExtension(fn: string, generic = false): string {
  return fn.replace(!generic ? VIDEO_EXTENSIONS : /(?:\.[a-z0-9]{2,5})+$/i, "");
}

// MIME Type Resolution
export function getMimeTypeFromExtension(name: string) {
  return mimeTypes[getExtension(name)] || "application/octet-stream"; // Default to binary stream
}

// Sorters
export function smartFlatSort<F extends { name: string }>(files: F[], debug = false, stripExt = noExtension, log = debug ? (title: string, ...body: any[]) => console.log(`[Sorter][${title}]`, ...body) : NOOP, bCache = new Map(), kCache = new Map(), groups = new Map()) {
  debug && console.time("[Sorter]"), log("Init", `Sorting ${files.length} items...`);
  // Extracts the main series title + optional season
  function getNamePrefix(name: string, base = stripExt(name), match = base.match(/(.*?)(?:(?:s|season)[\s\-]?)(\d+).*?(?:(?:e|ep|episode)[\s\-]?)(\d+)?/i)) {
    // prettier-ignore
    return bCache.set(name, base), (match ? (match[1].replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase() + " s" + match[2].padStart(2, "0")) : base.replace(/(?:(?:e|ep|episode|part)[\s\-]?)\d+/gi, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase()) || "unknown";
  }
  // Extract episode key: season, episode number(s), or special flags
  function extractEpisodeKey(name: string, base = bCache.get(name).toLowerCase()) {
    // Match lazy formats like "S02 - Episode 3", "S3 ep4", "S5E 7" (not strict SxxEyy)
    const combo = base.match(/(?:(?:s|season)[\s\-]?)(\d+).*?(?:(?:e|ep|episode)[\s\-]?)(\d+)/);
    if (combo) return [parseInt(combo[1]), parseInt(combo[2])];
    // Match "1x01", "5x12", alternate style used by some encoders or fansubs
    const alt = base.match(/(\d+)x(\d+)/);
    if (alt) return [parseInt(alt[1]), parseInt(alt[2])];
    // Match Roman numerals like "Season IV Episode IX"
    const roman = base.match(/(?:(?:s|season)[\s\-]?)([ivxlcdm]+).*?(?:(?:e|ep|episode)[\s\-]?)([ivxlcdm]+)/i);
    if (roman) return [parseRomanNum(roman[1], true), parseRomanNum(roman[2], true)];
    // Match fallback single-episode formats like "Ep12", "Episode 5", "E7", "Part 2" without season info
    const loose = base.match(/(?:(?:e|ep|episode|part)[\s\-]?)(\d+)/);
    if (loose) return [999, parseInt(loose[1])]; // Put these at the end with fake season 999
    // Totally unmatchable junk (e.g. "Behind the Scenes", "Bonus Feature")
    return [Infinity, Infinity]; // Hard fallback, gets sorted dead last
  }
  for (const file of files) {
    const key = getNamePrefix(file.name);
    let group = groups.get(key);
    log("Prefix", `"${file.name}" -> "${key}"`), (group ?? (groups.set(key, (group = [])), group)).push(file);
  }
  const sortedFiles = [],
    byGroup = ([a]: [string, F[]], [b]: [string, F[]], diff = a === "unknown" ? 1 : b === "unknown" ? -1 : a.localeCompare(b)) => (log("Group Compare", `[${a}] vs [${b}] = ${diff > 0 ? "B first" : diff < 0 ? "A first" : "Tie"}`), diff), // Sort groups alphabetically by their prefix
    getKey = (name: string, key = kCache.get(name)) => (key ? key : (kCache.set(name, (key = extractEpisodeKey(name))), key)),
    byEpisode = (a: F, b: F, ak = getKey(a.name), bk = getKey(b.name), diff = ak[0] !== bk[0] ? ak[0] - bk[0] : ak[1] - bk[1]) => (log("Episode Compare", `[${ak}] vs [${bk}] = ${diff > 0 ? "B first" : diff < 0 ? "A first" : "Tie"}  ("${a.name}" / "${b.name}")`), diff), // season | episode
    sortedGroups = (log("Groups", `Identified ${groups.size} group(s)`, groups), [...groups.entries()].sort(byGroup)); // Sort groups alphabetically by their prefix
  for (const [, group] of sortedGroups) group.sort(byEpisode), sortedFiles.push(...group);
  return log("Done", sortedFiles), debug && console.timeEnd("[Sorter]"), sortedFiles;
}
