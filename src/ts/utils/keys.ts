import { cleanKeyCombo, isArr } from "@t007/utils";

export { type KeysSettings, type KeyStruct, parseKeyCombo, stringifyKeyEvent, cleanKeyCombo, matchKeys, getTermsForKey, keyEventAllowed, formatKeyShortcutsTooltip, parseForARIAKS } from "@t007/utils";

export function formatAction(keyShortcut?: string | string[], voiceCmd?: string | string[], keyFn = (c = "") => cleanKeyCombo(c).replace(" ", "space"), wordFn = (c = "") => `"${c}"`): string {
  return [keyShortcut?.length ? `⌨️ ${isArr(keyShortcut) ? keyShortcut.map(keyFn).join(" or ") : keyFn(keyShortcut)}` : "", voiceCmd?.length ? `🎙️ ${isArr(voiceCmd) ? voiceCmd.map(wordFn).join(" or ") : wordFn(voiceCmd)}` : ""].filter(Boolean).join(" • ");
}

export function formatActionTooltip(keyShortcut?: string | string[], voiceCmd?: string | string[]): string {
  const combined = formatAction(keyShortcut, voiceCmd);
  return combined ? ` ( ${combined} )` : "";
}
