import type { ToastOptions } from "@t007/toast";
import type { ACTIONS_BUILD } from "@consts/actions";

export type ActionLogicOp = "set" | "increment" | "decrement" | "toggle";
export interface ActionLogic {
  path: string; // any path reachable from { media, settings }, e.g. "media.intent.volume", "settings.time.format.value"
  value?: any; // required for "set"; optional for "increment"/"decrement"; unused for "toggle"
  op?: ActionLogicOp; // defaults to "set"
}

export interface ActionLogicOptions {} // plugs extend via declaration merging

export interface Action extends ActionLogicOptions {
  id: keyof typeof ACTIONS_BUILD;
  label?: string;
  gates?: (keyof import("@defs/contract").MediaFeatures)[]; // gates notifications/toasts: aborts them if any listed feature is false
  logic?: ActionLogic[]; // serializable ops, wide scope on { media, settings }
  fn?: (...args: any[]) => void; // transient; undefined when serialized, re-filled by plug on boot
  notify?: string; // notifier key to fire after execution
  toast?: ToastOptions; // A toast to show when triggered
  private?: boolean; // hidden from the Actions menu (raw key internals etc.)
  zen?: boolean; // both keys and voice respect this, only runs in settings-open / zen mode
  userCreated?: boolean; // true when created via the settings UI, unlocks edit/delete
}
