import { FN_KEY } from "@consts/generics";
import { uid } from "@t007/utils";
import { limited as limitedOrig, LimitedOptions, LimitedHandle } from "@t007/utils";

// ============ Timer Helpers ============
export { setTimeout, setInterval, requestAnimationFrame, throttle, debounce, RAFLoop, cancelRAFLoop } from "@t007/utils";

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
