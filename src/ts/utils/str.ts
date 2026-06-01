import { uid as _uid } from "@t007/utils";
import { LUID_KEY } from "@consts/generics";
import type { TitleCase, CamelCase, NoCamelCase } from "@defs/str";

// Case Conversion
export function capitalize<T extends string>(word: T = "" as T): TitleCase<T> {
  return word.replace(/^(\s*)([a-z])/i, (_, s, l) => s + l.toUpperCase()) as TitleCase<T>;
}

export function camelize<T extends string>(str: T = "" as T, { source } = /[\s_-]+/, { preserveInnerCase: pIC = true, upperFirst: uF = false } = {}): CamelCase<T> {
  return (pIC ? str : str.toLowerCase()).replace(new RegExp(source + "(\\w)", "g"), (_, c) => c.toUpperCase()).replace(/^\w/, (c) => c[uF ? "toUpperCase" : "toLowerCase"]()) as CamelCase<T>;
}

export function uncamelize<T extends string, S extends string = " ">(str: T, separator: S = " " as S): NoCamelCase<T, S> {
  return str.replace(/([a-z])([A-Z])/g, `$1${separator}$2`).toLowerCase() as NoCamelCase<T, S>;
}

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
