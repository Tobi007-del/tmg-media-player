import { KeysSettings } from "sia-reactor/utils";
import type { Action } from "@defs/actions";
import { KEY_SHORTCUT_MOD_ACTIONS, KEYS_WHITELIST } from "./build";

export type KeyPhase = "keydown" | "keyup";
export type KeyMod = "" | "ctrl" | "alt" | "shift";

export type WhitelistedKey = (typeof KEYS_WHITELIST)[number];
export type KeyShortcutModAction = (typeof KEY_SHORTCUT_MOD_ACTIONS)[number];

export interface KeyShortcutMods extends Record<KeyShortcutModAction, Partial<Record<Exclude<KeyMod, "">, number>>> {}

export interface KeyShortcuts extends Record<Action["id"], string | string[]> {}

export interface KeysConfig extends Required<KeysSettings> {
  shortcuts: KeyShortcuts;
  mods: {
    disabled: boolean;
  } & KeyShortcutMods;
}

declare module "@defs/actions" {
  interface ActionLogicOptions {
    keyboard?: { phase?: KeyPhase | readonly KeyPhase[] };
  }
}
