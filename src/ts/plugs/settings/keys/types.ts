import { KEYS_MODS, KeysSettings } from "sia-reactor/utils";
import type { UISettings } from "@defs/UIOptions";
import type { Action } from "@defs/action";
import { KEYS_MODS_ACTIONS } from "./build";

export type KeyPhase = "keydown" | "keyup" | "none" | "";
export type KeyMod = (typeof KEYS_MODS)[number] | "";
export type KeyModAction = (typeof KEYS_MODS_ACTIONS)[number];

export interface KeyMods extends Record<KeyModAction, Partial<Record<Exclude<KeyMod, "">, number>>> {}

export interface KeyShortcuts extends Record<Action["id"], string | string[]> {}

export interface KeysConfig extends Required<KeysSettings> {
  shortcuts: KeyShortcuts;
  mods: { disabled: boolean } & KeyMods;
  showOverlay: boolean;
  phase: UISettings<KeyPhase>;
}

declare module "@defs/action" {
  interface Action {
    keyboard?: { phase?: KeyPhase };
  }
}
