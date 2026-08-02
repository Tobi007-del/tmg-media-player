import { cleanKeyCombo } from "@t007/utils";
export { type KeysSettings, type KeyStruct, parseKeyCombo, stringifyKeyEvent, cleanKeyCombo, matchKeys, getTermsForKey, keyEventAllowed, formatKeyShortcutsForDisplay, parseForARIAKS } from "@t007/utils";

export function formatAction(keyShortcut: string | string[] | undefined, voiceCmd?: string[] | undefined): string {
  const kArr = Array.isArray(keyShortcut) ? keyShortcut : keyShortcut ? [keyShortcut] : [];
  return [kArr.length ? `⌨️ ${kArr.map((c) => cleanKeyCombo(c).replace(" ", "space")).join(" or ")}` : "", voiceCmd?.length ? `🎙️ ${voiceCmd.map((c) => `"${c}"`).join(" or ")}` : ""].filter(Boolean).join(" · ");
}

export function formatActionForDisplay(keyShortcut: string | string[] | undefined, voiceCmd?: string[] | undefined): string {
  const combined = formatAction(keyShortcut, voiceCmd);
  return combined ? ` ( ${combined} )` : "";
}
