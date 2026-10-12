import { cleanKeyCombo, isArr } from "@t007/utils";
import { isObj } from "@utils/obj";
import type { Settings } from "@defs/config";
import { Action } from "@defs/action";

export { type KeysSettings, type KeyStruct, parseKeyCombo, stringifyKeyEvent, cleanKeyCombo, matchKeys, getTermsForKey, keyEventAllowed, formatKeyShortcutsTooltip, parseForARIAKS } from "@t007/utils";

type CmdValue = string | string[];

export function formatAction(settings: Partial<Settings> | Record<string, any>, cmdKey: Action["id"], keyFn?: (c?: string) => string, wordFn?: (c?: string) => string): string;
export function formatAction(keyShortcut?: CmdValue, voiceCmd?: CmdValue, keyFn?: (c?: string) => string, wordFn?: (c?: string) => string): string;
export function formatAction(arg1?: Partial<Settings> | Record<string, any> | CmdValue, arg2?: CmdValue, keyFn = (c = "") => cleanKeyCombo(c).replace(" ", "space"), wordFn = (c = "") => `"${c}"`): string {
  const isConfig = isObj(arg1),
    keyShortcut: CmdValue = isConfig ? (arg1 as any).keys.shortcuts[arg2 as string] : arg1,
    voiceCmd: CmdValue = isConfig ? (arg1 as any).voice.commands[arg2 as string] : arg2;
  return [keyShortcut?.length ? `⌨️ ${isArr(keyShortcut) ? keyShortcut.map(keyFn).join(" or ") : keyFn(keyShortcut)}` : "", voiceCmd?.length ? `🎙️ ${isArr(voiceCmd) ? voiceCmd.map(wordFn).join(" or ") : wordFn(voiceCmd)}` : ""].filter(Boolean).join(" • ");
}

export function formatActionTooltip(settings: Partial<Settings> | Record<string, any>, cmdKey: Action["id"]): string;
export function formatActionTooltip(keyShortcut?: CmdValue, voiceCmd?: CmdValue): string;
export function formatActionTooltip(arg1?: any, arg2?: any): string {
  const combined = formatAction(arg1, arg2);
  return combined ? ` ( ${combined} )` : "";
}
