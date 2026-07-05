import { ToastPosition } from "@t007/toast";
import { UISettings } from "@defs/UIOptions";

export interface VoiceConfig {
  active: UISettings<boolean | "passive">;
  wakeWord: string; // e.g., "hey player", "" means UI button only
  behavior: UISettings<"persistent" | "auto" | "strict">; // "persistent" means UI always show, "auto" means UI show on speech, "strict" means UI after wake word
  timeout: number; // e.g., 3000ms of silence puts it back to sleep
  inputs: {
    direct: boolean;
    strict: UISettings<boolean | "auto">;
    accuracy: number; // e.g., 0.75 means 75% character overlap required
  };
  commandsDisabled: boolean;
  commands: Record<string, string[]>;
  autoToggles: boolean;
  listenerPos: UISettings<ToastPosition>;
  predictorPos: UISettings<ToastPosition>;
}

export interface VoiceState {
  context: string; // "*" means no context, otherwise it's a path like "media" or "settings"
  listening: boolean;
}

declare module "@defs/actions" {
  interface ActionOptions {
    voice?: { stage?: VoiceStage };
  }
}
