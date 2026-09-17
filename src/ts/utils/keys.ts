import { cleanKeyCombo, isArr } from "@t007/utils";

export { type KeysSettings, type KeyStruct, parseKeyCombo, stringifyKeyEvent, cleanKeyCombo, matchKeys, getTermsForKey, keyEventAllowed, formatKeyShortcutsForDisplay, parseForARIAKS } from "@t007/utils";

export function formatAction(keyShortcut: string | string[] | undefined, voiceCmd?: string[] | undefined, keyFn = (c = "") => cleanKeyCombo(c).replace(" ", "space"), wordFn = (c = "") => `"${c}"`): string {
  const kArr = isArr(keyShortcut) ? keyShortcut : keyShortcut ? [keyShortcut] : [];
  return [kArr.length ? `⌨️ ${kArr.map(keyFn).join(" or ")}` : "", voiceCmd?.length ? `🎙️ ${voiceCmd.map(wordFn).join(" or ")}` : ""].filter(Boolean).join(" • ");
}

export function formatActionForDisplay(keyShortcut: string | string[] | undefined, voiceCmd?: string[] | undefined): string {
  const combined = formatAction(keyShortcut, voiceCmd);
  return combined ? ` ( ${combined} )` : "";
}
