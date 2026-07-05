import { BasePlug } from "../../base";
import type { ToastsConfig, ToastReminder, ToastsState } from "./types";
import { TOASTS_BUILD } from "./build";
import { createEl } from "@utils/dom";
import { Controller } from "@core/controller";
import { setTimeout } from "sia-reactor/utils";
import { ToastOptions } from "@t007/toast";
import { NOOP } from "sia-reactor";

export class ToastsPlug extends BasePlug<ToastsConfig, ToastsState> {
  public static readonly plugName = "toasts";
  public static readonly BUILD = TOASTS_BUILD;
  public container?: HTMLElement;

  constructor(ctlr: Controller, config = ctlr.settings.toasts) {
    super(ctlr, config, { reminders: [] });
  }

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.toasts.disabled", ({ value }) => value && t007.toast?.dismissAll(this.ctlr.config.id), { signal: this.signal });
    this.ctlr.config.on("settings.toasts", ({ type, target: { path, key, value } }) => type === "update" && !/disabled/.test(path) && t007.toast?.doForAll("update", { [key]: value }, this.ctlr.config.id), { signal: this.signal });
    // Post Wiring
    super.wire();
  }

  public override mount(): void {
    this.container = createEl("div", { className: "tmg-media-toasts-container" });
    this.media.container.append(this.container);
  }
  public override unmount(): void {
    this.container?.remove();
  }

  public get toast() {
    if (!this.config || this.config.disabled || !t007.toaster) return null; // after the nuke, ctlr might need me for errors but one of use is the wiser
    return t007.toaster({ groupId: this.ctlr.config.id, rootElement: this.container || this.media.container, signal: this.signal, ...this.config });
  }

  public addReminder(opts: Omit<ToastReminder, "id" | "timeoutId">): void {
    if (!opts.message) return;
    const id = Date.now().toString(),
      reminder = { id, ...opts, timeoutId: 0 } as ToastReminder;
    if (!opts.delay) return this.triggerReminder(id, reminder);
    reminder.timeoutId = setTimeout(() => this.triggerReminder(id), opts.delay, this.signal);
    this.state.reminders.push(reminder);
  }
  public removeReminder(id: string): void {
    const idx = this.state.reminders.findIndex((r) => r.id === id);
    if (idx !== -1) clearTimeout(this.state.reminders[idx].timeoutId), this.state.reminders.splice(idx, 1);
  }
  public triggerReminder(id: string, temp?: ToastReminder): void {
    const r = temp || this.state.reminders.find((x) => x.id === id);
    if (!r) return;
    this.removeReminder(id);
    if (r.actionId) this.ctlr.runAction(r.actionId);
    const { id: _i, message: _m, delay: _d, actionId: _a, timeoutId: _t, autoClose, ...opts } = r as any;
    this.toast?.(r.message, { ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) }), this.ctlr.plug("settings.settingsView")?.menu.syncUI();
  }
}

export const tutorialOpts = (onGotIt: () => void = NOOP): Partial<ToastOptions> => ({ type: "info", icon: "💡", position: "center-center", closeButton: true, hideProgressBar: false, animation: "fade", actions: { "Got it!": onGotIt } });

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
