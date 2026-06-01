import { KeysSettings } from "sia-reactor/utils";
import { KeyShortcutAction, KeyShortcutModAction } from "@defs/generics";

export type KeyPhase = "keydown" | "keyup";
export type KeyMod = "" | "ctrl" | "alt" | "shift";
export type KeyHook = {
  fn: KeyHandler;
  zen?: boolean;
};
export type KeyHandler = (e: KeyboardEvent, mod: KeyMod) => void;
export type KeyRegOptions = {
  phase?: KeyPhase | readonly KeyPhase[];
  shortcut?: string | string[];
  overwrite?: boolean;
  zen?: boolean; // an isolated mode where only flagged keys work, made for 3d flipped settings view
};

export interface KeyShortcuts extends Record<KeyShortcutAction, string | string[]> {}
export interface KeyShortcutMods extends Record<KeyShortcutModAction, Partial<Record<Exclude<KeyMod, "">, number>>> {}

export interface Keys extends Required<KeysSettings> {
  shortcuts: KeyShortcuts;
  mods: {
    disabled: boolean;
  } & KeyShortcutMods;
}
