import { AptRange } from "@defs/generics";
import { isNum, clamp } from "@t007/utils";

// Validators
export { clamp };

export function isSafeNum(val: any): boolean {
  return isNum(val) && !isNaN(val ?? NaN) && val !== Infinity;
}

export function safeNum(number: any, fallback = 0): number {
  return isSafeNum(number) ? number : fallback;
}

// Parsers
export function parseIfPercent(percent: any, amount: any, autocap = 0.25): number {
  const val = percent?.endsWith?.("%") ? safeNum((parseFloat(percent) / 100) * amount) : percent;
  return val && amount && autocap && amount <= val ? amount * autocap : val;
}

export function parseRomanNum(roman: string, valid = /^[IVXLCDM]+$/i.test(roman), ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 } as Record<string, number>): number {
  if (!valid) return 0; // ← Invalid input
  return roman
    .toUpperCase() // Ensure consistent uppercase (e.g., 'iv' becomes 'IV')
    .split("") // Turn into array of characters: 'XIV' → ['X','I','V']
    .reduce((acc, val, i, arr) => {
      const curr = ROMAN[val] || 0, // Current character's value
        next = ROMAN[arr[i + 1]] || 0; // Look ahead to the next character (if any)
      return acc + (curr < next ? -curr : curr); // Subtractive notation: if current is less than next (e.g., I before V → 4); Otherwise, just add normally
    }, 0); // Start accumulator at 0
}

// Helpers
export function stepNum<T extends AptRange>(v = 0, { min, max, step }: T): number {
  const s = step ? Math.round((safeNum(v) - (min || 0)) / step) * step + (min || 0) : safeNum(v);
  return clamp(min, +s.toFixed(10), max); // no gymnastics, for sliders only; to reach near native speed
}

const _stepsCache = new Map<string, number[]>();
export function rotateAny<T>(cur: T, steps: T[] | readonly T[], dir?: "forwards" | "backwards", wrap?: boolean): T;
export function rotateAny(cur: number, steps: AptRange, dir?: "forwards" | "backwards", wrap?: boolean): number;
export function rotateAny(cur: any, steps: any, dir: "forwards" | "backwards" = "forwards", wrap = true): any {
  let list: any[];
  if (Array.isArray(steps)) list = steps;
  else {
    const key = `${steps.min}|${steps.max}|${steps.step}`; // Generate cache key from min|max|step
    if (_stepsCache.has(key)) list = _stepsCache.get(key)!;
    else _stepsCache.set(key, (list = Array.from({ length: Math.floor((steps.max - steps.min) / steps.step) + 1 }, (_, i) => steps.min + i * steps.step)));
  }
  let idx = isNum(cur) ? list.reduce((p, c, x) => (Math.abs(c - cur) < Math.abs(list[p] - cur) ? x : p), 0) : list.indexOf(cur);
  idx = idx + (dir === "forwards" ? 1 : -1);
  return list[wrap ? (idx + list.length) % list.length : clamp(0, idx, list.length - 1)];
}
