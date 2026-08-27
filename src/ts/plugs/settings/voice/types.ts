import { ToastPosition } from "@t007/toast";
import type { Action } from "@defs/actions";
import { UISettings } from "@defs/UIOptions";

export type VoiceStage = "anytime" | "pre-route" | "post-route";

export interface VoiceCommands extends Record<Action["id"], string[]> {}

export interface VoiceConfig {
  active: UISettings<boolean | "passive">;
  muted: boolean;
  wakeWord: string; // e.g., "hey player", "" means UI button only
  timeout: number; // e.g., 3000ms of silence puts it back to sleep
  inputs: {
    direct: boolean;
    strict: UISettings<boolean | "auto">;
    accuracy: number; // e.g., 0.75 means 75% character overlap required
    autoToggles: boolean;
    allowCommands: boolean;
  };
  commands: VoiceCommands;
  toasts: {
    behavior: UISettings<"persistent" | "auto" | "strict">; // "persistent" means UI always show, "auto" means UI show on speech, "strict" means UI after wake word
    listenerPos: UISettings<ToastPosition>;
    predictorPos: UISettings<ToastPosition>;
  };
}

export interface VoiceState {
  context: string; // "*" means no context, otherwise it's a path like "media" or "settings"
  listening: boolean;
}

declare module "@defs/actions" {
  interface ActionLogicOptions {
    voice?: {
      stage?: VoiceStage;
    };
  }
}
