import { FN_KEY } from "@consts/generics";
import { uid } from "@t007/utils";
import { limited as limitedOrig, LimitedOptions, LimitedHandle } from "@t007/utils";
import { setTimeout, requestAnimationFrame } from "@t007/utils";

// ============ Timer Helpers ============
export { setTimeout, setInterval, requestAnimationFrame } from "@t007/utils";

export const throttleMap = new Map<string, number>();
export function throttle(key: string, fn: Function, delay = 30, strict = true, signal?: AbortSignal, win?: Window): void {
  if (strict) {
    const now = performance.now();
    return now - (throttleMap.get(key) ?? 0) < delay ? undefined : throttleMap.set(key, now), fn();
  }
  if (throttleMap.has(key)) return;
  const id = setTimeout(() => throttleMap.delete(key), delay, signal, win); // uses timeout so code runs when sync thread is free
  return throttleMap.set(key, id), fn();
}

export const rafLoopMap = new Map<string, Function>();
export function RAFLoop(key: string, fn: Function, signal?: AbortSignal, win?: Window & typeof globalThis): void {
  if (rafLoopMap.has(key)) return void rafLoopMap.set(key, fn); // Just update the function
  rafLoopMap.set(key, fn);
  const loop = (_ = 0, fn = rafLoopMap.get(key)) => fn && (fn(), requestAnimationFrame(loop, signal, win)); // Exit or run
  requestAnimationFrame(loop, signal, win);
}
export function cancelRAFLoop(key: string): void {
  rafLoopMap.delete(key);
}

// ============ Async Helpers ============
export { mockAsync, breath, deepBreath } from "@t007/utils";

// ============ Limited Call Helpers ============
export const limited = <T extends (...args: any[]) => any>(fn: T, opts: LimitedOptions | string = {}): LimitedHandle<T> => limitedOrig(FN_KEY, fn, opts);

export const oncePerSession = <T extends (...args: any[]) => any>(fn: T) => limited(fn);
export const onceEver = <T extends (...args: any[]) => any>(fn: T, key = uid()) => limited(fn, key);

// ============ Deprecation Helpers ============
/**
 * Log a deprecation warning (once per session)
 * @param message - Deprecation warning message
 */
export function deprecate(message: string): void {
  oncePerSession(() => console.warn(message))();
}

/**
 * Log a deprecation warning for a major version upgrade
 * @param major - Major version number when removal occurs
 * @param oldName - Name of deprecated feature
 * @param newName - Optional replacement feature name
 */
export function deprecateForMajor(major: number, oldName: string, newName?: string): void {
  deprecate(newName ? `${oldName} is deprecated and will be removed in ${major}.0; use ${newName} instead.` : `${oldName} is deprecated and will be removed in ${major}.0.`);
}

// ============ Generic Helpers ============
export { bindCleanupToSignal } from "@t007/utils";
