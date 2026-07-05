import type { ToastOptions } from "@t007/toast";

export type KeyPhase = "keydown" | "keyup";
export type VoiceStage = "always" | "pre-process" | "post-process";
export type ActionOp = "set" | "increment" | "decrement" | "toggle";

export interface ActionLogic {
  path: string; // any path reachable from { media, settings }, e.g. "media.intent.volume", "settings.time.format.value"
  value?: any; // required for "set"; optional for "increment"/"decrement"; unused for "toggle"
  op?: ActionOp; // defaults to "set"
}

export interface ActionOptions {} // plugs extend via declaration merging

export interface Action extends ActionOptions {
  id: string;
  label?: string;
  logic?: ActionLogic[]; // serializable ops, wide scope on { media, settings }
  fn?: (...args: any[]) => void; // transient; undefined when serialized, re-filled by plug on boot
  notify?: string; // notifier key to fire after execution
  toast?: ToastOptions; // A toast to show when triggered
  private?: boolean; // hidden from the Actions menu (raw key internals etc.)
  zen?: boolean; // both keys and voice respect this, only runs in settings-open / zen mode
  userCreated?: boolean; // true when created via the settings UI, unlocks edit/delete
}
