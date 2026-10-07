import { BasePlug } from "../../base";
import type { ToastsConfig } from "./types";
import { TOASTS_BUILD } from "./build";
import { createEl } from "@utils/dom";
import { setTimeout, clamp } from "sia-reactor/utils";
import { Toast, ToastOptions } from "@t007/toast";
import { NOOP, REvent } from "sia-reactor";
import { CtlrConfig } from "@defs/config";

export class ToastsPlug extends BasePlug<ToastsConfig> {
  public static readonly plugName = "toasts";
  public static readonly BUILD = TOASTS_BUILD;
  public container!: HTMLElement;
  public toast?: Toast;
  public timeouts = new Map<string, { tid: number; after: number }>();

  public override mount(): void {
    this.container = this.media.container.appendChild(createEl("div", { className: "tmg-media-toasts-container tmg-media-cover tmg-media-fill tmg-media-no-pointer tmg-media-curve" }));
    this.toast = t007.toaster({ rootElement: this.container, signal: this.signal, ...this.config }, this.ctlr.config.id);
  }
  public override unmount(): void {
    this.container.remove();
  }

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.toasts", ({ type, value, path, target: { key } }) => type === "update" && !/reminders/.test(path) && t007.toast?.doForAll("update", { [key]: ((this.toast!.defaults as any)[key] = value) }, this.ctlr.config.id), { signal: this.signal });
    this.ctlr.config.on("settings.toasts.reminders", this.handleReminders, { init: true, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleReminders({ target: { key }, currentTarget: { value } }: REvent<CtlrConfig, "settings.toasts.reminders">): void {
    if ((key as string) === "target") return;
    for (const [id, entry] of this.timeouts) if (!value?.[id]) clearTimeout(entry.tid), this.timeouts.delete(id);
    for (const [id, rmdr] of Object.entries(value ?? {})) {
      const entry = this.timeouts.get(id);
      if (entry?.after === rmdr.after) continue;
      if (entry) clearTimeout(entry.tid), this.timeouts.delete(id);
      if (entry || !rmdr.target) rmdr.target = Date.now() + rmdr.after;
      const rem = rmdr.target - Date.now();
      rem <= 0 ? this.trigger(id, rmdr) : this.timeouts.set(id, { tid: setTimeout(() => this.trigger(id), clamp(0, rem, 2147483647), this.signal), after: rmdr.after });
    }
  }

  protected trigger(id: string, rmdr = this.config.reminders[id]): void {
    if (!rmdr) return;
    const { id: _i, message, after: _a, actionId, ...opts } = rmdr;
    this.timeouts.delete(id), delete this.config.reminders[id];
    this.ctlr.perform(actionId), this.toast?.(message, { ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) });
  }

  protected override onDestroy(): void {
    this.timeouts.forEach(({ tid }) => clearTimeout(tid));
  }
}

export const tutorialOpts = (onGotIt: () => void = NOOP): Partial<ToastOptions> => ({ type: "info", icon: "💡", position: "center-center", hideProgressBar: false, actions: { "Got it!": onGotIt } });

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.toasts": typeof ToastsPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    toasts: ToastsConfig;
  }
}

export type * from "./types";
export * from "./build";
