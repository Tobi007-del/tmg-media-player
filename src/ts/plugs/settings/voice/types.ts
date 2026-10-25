import type { ToastOptions } from "@t007/toast";
import type { Action } from "@defs/action";
import { UISettings } from "@defs/UIOptions";

export type VoiceStage = "anytime" | "pre-route" | "post-route" | "never" | "";
export type VoiceMatch = "blob" | "chunk" | "";

export interface VoiceCommands extends Record<Action["id"], string | string[]> {}

export interface VoiceAiConfig {
  active: boolean;
  model: string;
  apiKey?: string;
  endpoint?: string;
  systemPrompt: string;
  preference?: string;
}

export interface VoiceConfig {
  active: UISettings<boolean | "passive">;
  muted: boolean;
  ai: VoiceAiConfig;
  process: {
    accuracy: number;
    allowCommands: boolean;
    stage: UISettings<VoiceStage>;
    match: UISettings<VoiceMatch>;
  };
  routing: {
    timeout: number;
    direct: boolean;
    strict: UISettings<boolean | "auto">;
    autoToggles: boolean;
  };
  commands: VoiceCommands;
  feedback: {
    behavior: UISettings<"persistent" | "auto" | "strict">; // "persistent" means UI always show, "auto" means UI show on speech, "strict" means UI after wake word
    router: ToastOptions;
    helper: ToastOptions;
    copilot: Record<"speech" | "captions", boolean>;
  };
}

export interface VoiceAiState {
  status: string;
  prompt: string;
  speech: string;
}

export interface VoiceState {
  ctx: string; // "*" means no context, otherwise it's a path like "media" or "settings"
  routing: boolean;
}

export interface AiResponse {
  action?: Action["id"];
  path?: string;
  value?: any;
  query?: string;
  speech?: string;
}

declare module "@defs/action" {
  interface Action {
    voice?: {
      stage?: VoiceStage;
      match?: VoiceMatch;
    };
  }
}
