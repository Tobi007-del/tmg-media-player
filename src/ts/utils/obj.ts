import { camelize } from "./str";
import type { Control, ControlPanelBottomTuple } from "@plugs/settings/controlPanel/types";
import { type Paths, type PathValue } from "sia-reactor";
import { setPath } from "sia-reactor/utils";
import type { UIObject, UISettings } from "@defs/UIOptions";
import { isObj, isArr } from "@t007/utils";

export { isArr, isObj };
export { isDef, isSym, isBool, isNum, isStr, isPOJO, isIter, isFunc, inBoolArrOpt } from "@t007/utils";

// Type Guards
export function isUISetting<T = unknown>(obj: any): obj is UISettings<T> {
  return isObj(obj) && "options" in obj && isArr(obj.options);
}

// Assignment & Derivation
export function setHTMLConfig<T extends object>(target: T, attr: `tmg--${Paths<T, "--">}`, value: string): void {
  value = value.trim();
  const path = attr.replace("tmg--", "") as Paths<T, "--">;
  const parsedValue = (() => {
    if (value.includes(",")) return value.split(",")?.map((v: string) => v.trim());
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    if (/^\d+$/.test(value)) return Number(value);
    return value;
  })() as PathValue<T, typeof path, "--">;
  setPath<T, "--">(target, path, parsedValue, "--", (p) => camelize(p));
}

export function parseUIObj<T extends Record<string, any>>(obj: T): UIObject<T> {
  const result: any = {} as UIObject<T>,
    keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const entry = obj[keys[i]];
    if (!isObj(entry)) continue;
    if (isUISetting(entry)) {
      result[keys[i]] = {
        values: entry.options.map((opt: any) => ("value" in opt ? opt.value : opt)),
        displays: entry.options.map((opt: any) => ("display" in opt ? opt.display : String(opt))),
      };
    } else result[keys[i]] = parseUIObj(entry); // recurse on sub-branch
  }
  return result;
}

export function parsePanelBottomObj(obj: Partial<ControlPanelBottomTuple> | Control[][] | Control[] | unknown, arr?: false): ControlPanelBottomTuple | false;
export function parsePanelBottomObj(obj: Partial<ControlPanelBottomTuple> | Control[][] | Control[] | unknown, arr: true): Control[] | false;
export function parsePanelBottomObj(obj: Partial<ControlPanelBottomTuple> | Control[][] | Control[] | unknown = [], arr = false): ControlPanelBottomTuple | Control[] | false {
  if (!isObj(obj) && !isArr(obj)) return false;
  const [third = [], second = [], first = []] = isObj<Partial<ControlPanelBottomTuple>>(obj) ? (Object.values(obj).reverse() as Control[][]) : isArr((obj as Control[][])[0]) ? [...(obj as Control[][])].reverse() : [obj as Control[]];
  return arr ? ([...third, ...second, ...first] as Control[]) : ({ 1: first, 2: second, 3: third } as ControlPanelBottomTuple);
}
