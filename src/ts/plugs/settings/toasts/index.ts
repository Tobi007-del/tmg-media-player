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
  public container!: HTMLElement;

  constructor(ctlr: Controller, config = ctlr.settings.toasts) {
    super(ctlr, config, { reminders: [] });
  }

  public override mount(): void {
    this.container = createEl("div", { className: "tmg-media-toasts-container" });
    this.media.container.append(this.container);
  }
  public override unmount(): void {
    this.container.remove();
  }

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.toasts.disabled", ({ value }) => value && t007.toast?.dismissAll(this.ctlr.config.id), { signal: this.signal });
    this.ctlr.config.on("settings.toasts", ({ type, target: { path, key, value } }) => type === "update" && !/disabled/.test(path) && t007.toast?.doForAll("update", { [key]: value }, this.ctlr.config.id), { signal: this.signal });
    // Post Wiring
    super.wire();
  }

  public get toast() {
    if (!this.config || this.config.disabled || !t007.toaster) return null; // after the nuke, ctlr might need me for errors but one of use is the wiser
    return t007.toaster({ groupId: this.ctlr.config.id, rootElement: this.container, signal: this.signal, ...this.config });
  }

  public addReminder(opts: Omit<ToastReminder, "id" | "timeoutId">): void {
    if (!opts.message) return;
    const rmdr = { id: Date.now().toString(), ...opts, timeoutId: -1 } as ToastReminder;
    if (!opts.delay) return this.triggerReminder(rmdr.id, rmdr);
    rmdr.timeoutId = setTimeout(() => this.triggerReminder(rmdr.id), opts.delay, this.signal);
    this.state.reminders.push(rmdr);
  }
  public removeReminder(id: string): void {
    const idx = this.state.reminders.findIndex((rmdr) => rmdr.id === id);
    if (idx !== -1) clearTimeout(this.state.reminders[idx].timeoutId), this.state.reminders.splice(idx, 1);
  }
  public triggerReminder(id: string, rmdr = this.state.reminders.find((x) => x.id === id)): void {
    const { id: _i, message: _m, delay: _d, actionId: _a, timeoutId: _t, autoClose, ...opts } = rmdr || {};
    if (rmdr) this.removeReminder(id), this.ctlr.perform(rmdr.actionId), this.toast?.(rmdr.message, { ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) });
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
