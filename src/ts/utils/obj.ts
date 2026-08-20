import { camelize } from "./str";
import type { AnyControl, Control, ControlPanelBottomTuple, ControlPanelConfig } from "@plugs/settings/controlPanel/types";
import { type Paths } from "sia-reactor";
import { setPath } from "sia-reactor/utils";
import type { UIObject, UISettings, UIOption, UITuple } from "@defs/UIOptions";
import { isObj, isArr, isStr } from "@t007/utils";

export { isArr, isObj };
export { isDef, isSym, isBool, isNum, isStr, isPOJO, isIter, isFunc, inBoolArrOpt } from "@t007/utils";

// Type Guards
export function isUISetting<T = unknown>(obj: unknown): obj is UISettings<T> {
  return isObj(obj) && "options" in obj && isArr((obj as UISettings<T>).options);
}
export function isUIOption<T>(opt: UIOption<T>): opt is UITuple<T> {
  return isObj(opt) && "value" in (opt as object);
}

// Assignment & Derivation
export function setHTMLConfig<T extends object>(target: T, attr: `tmg--${Paths<T, "--">}`, value: string): void {
  value = value.trim();
  const path = attr.replace("tmg--", "") as any,
    parsed = (() => (value.includes(",") ? value.split(",")?.map((v: string) => v.trim()) : value === "true" ? true : value === "false" ? false : value === "null" ? null : /^\d+$/.test(value) ? Number(value) : value))() as any;
  setPath(target, path, parsed, "--", (p) => camelize(p));
}

export function getBoolOrStr(value: string | boolean): string | boolean {
  return value === "true" ? true : value === "false" ? false : value;
}

export function getUIOpt<T = unknown>(opts: UIOption<T>[] | undefined, value: T, key: "display" | "value" = "display"): string {
  if (opts)
    for (const opt of opts) {
      const p = parseUIOpt<T>(opt);
      if (p.value === value) return p[key] as string;
    }
  return String(value);
}

export function getUniqueOpts<T>(options: UITuple<T>[]) {
  const counts: Record<string, number> = {};
  for (const opt of options) counts[opt.display] = (counts[opt.display] || 0) + 1;
  const seen: Record<string, number> = {};
  for (let i = options.length - 1; i >= 0; i--) {
    const opt = options[i];
    if (counts[opt.display] > 1) {
      seen[opt.display] = (seen[opt.display] || 0) + 1;
      const num = counts[opt.display] - seen[opt.display] + 1;
      opt.display = `${opt.display} ${num}`;
    }
  } // Second pass: Add numbers to duplicates, tracking our current index from the back
  return options;
}

export function parseUIOpt<T = unknown>(opt: UIOption<T>): UITuple<T> {
  return isUIOption<T>(opt) ? { ...opt, display: String(opt.display ?? opt.value) } : { value: opt as T, display: String(opt) };
}
export function parseUIOpts<T = unknown>(opts: UIOption<T>[]): T[] {
  return opts.map((opt) => parseUIOpt(opt).value);
}
export function parseUIBadge(badge?: string | { label?: string; value?: string } | null): { label?: string; value?: string } | undefined {
  return isStr(badge) ? { value: badge } : badge || undefined;
}

export function parseUIObj<T extends Record<string, any>>(obj: T): UIObject<T> {
  const result: any = {} as UIObject<T>,
    keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const entry = obj[keys[i]];
    if (!isObj(entry)) continue;
    if (isUISetting(entry)) result[keys[i]] = { values: entry.options.map((opt: UIOption<unknown>) => parseUIOpt(opt).value), displays: entry.options.map((opt: UIOption<unknown>) => parseUIOpt(opt).display) };
    else result[keys[i]] = parseUIObj(entry); // recurse on sub-branch
  }
  return result;
}

// Control Panel Utilities
export function parsePanelBottomObj(obj: Partial<ControlPanelBottomTuple> | Control[][] | Control[] | unknown, arr?: false): ControlPanelBottomTuple | false;
export function parsePanelBottomObj(obj: Partial<ControlPanelBottomTuple> | Control[][] | Control[] | unknown, arr: true): Control[] | false;
export function parsePanelBottomObj(obj: Partial<ControlPanelBottomTuple> | Control[][] | Control[] | unknown = [], arr = false): ControlPanelBottomTuple | Control[] | false {
  if (!isObj(obj) && !isArr(obj)) return false;
  const [third = [], second = [], first = []] = isObj<Partial<ControlPanelBottomTuple>>(obj) ? (Object.values(obj).reverse() as Control[][]) : isArr((obj as Control[][])[0]) ? [...(obj as Control[][])].reverse() : [obj as Control[]];
  return arr ? ([...third, ...second, ...first] as Control[]) : ({ 1: first, 2: second, 3: third } as ControlPanelBottomTuple);
}

export function getPanelSplitCtrls<T = any>(row?: T[]): { left: T[]; center: T[]; right: T[] } {
  if (!row?.length) return { left: [], center: [], right: [] };
  const s1 = row.indexOf("spacer" as any),
    s2 = row.indexOf("spacer" as any, s1 + 1);
  return s1 === -1 ? { left: row, center: [], right: [] } : s2 === -1 ? { left: row.slice(0, s1), center: [], right: row.slice(s1 + 1) } : { left: row.slice(0, s1), center: row.slice(s1 + 1, s2), right: row.slice(s2 + 1) };
}

export function getPanelLocation(b: ControlPanelConfig, id: AnyControl) {
  if (isArr(b.top) && b.top.includes(id)) {
    const split = getPanelSplitCtrls(b.top);
    return { path: "top", row: b.top, zone: split.left.includes(id) ? "left" : split.center.includes(id) ? "center" : "right" };
  } else if (isArr(b.center) && b.center.includes(id)) return { path: "center", row: b.center, zone: "zone" };
  if (b.bottom) {
    const dB = parsePanelBottomObj(b.bottom);
    if (dB) for (const k in dB) if ((dB as any)[k]?.includes(id)) return { path: `bottom.${k}`, row: (dB as any)[k], zone: getPanelSplitCtrls((dB as any)[k]).left.includes(id) ? "left" : getPanelSplitCtrls((dB as any)[k]).center.includes(id) ? "center" : "right" };
  }
  return { path: "bottom.1", row: [], zone: "left" };
}

export function inPanel(b: ControlPanelConfig, id: AnyControl): boolean {
  if ((isArr(b.top) && b.top.includes(id)) || (isArr(b.center) && b.center.includes(id))) return true;
  if (b.bottom) {
    const dB = parsePanelBottomObj(b.bottom);
    if (dB) for (const k in dB) if ((dB as any)[k]?.includes(id)) return true;
  }
  return false;
}

export function insertPanelCtrl(current: AnyControl[], defaults: readonly AnyControl[], id: AnyControl, _didx = defaults.indexOf(id)): void {
  let s = 0;
  for (let i = 0; i < _didx; i++) if (defaults[i] === "spacer") s++;
  for (let i = _didx + 1; i < defaults.length; i++)
    if (defaults[i] === "spacer") {
      let c = 0;
      for (let j = 0; j < current.length; j++) if (current[j] === "spacer" && ++c === s + 1) return void current.splice(j, 0, id);
    } else {
      const idx = current.indexOf(defaults[i]);
      if (idx !== -1) return void current.splice(idx, 0, id);
    }
  current.push(id);
}
