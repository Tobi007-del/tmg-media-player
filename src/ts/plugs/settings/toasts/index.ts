import { BasePlug } from "../../base";
import type { Toasts } from "./types";
import { TOASTS_BUILD } from "./build";
import type { REvent } from "sia-reactor";
import type { CtlrConfig } from "@defs/config";

export class ToastsPlug extends BasePlug<Toasts> {
  public static readonly plugName = "toasts";
  public static readonly BUILD = TOASTS_BUILD;

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.toasts.disabled", this.handleDisabled, { signal: this.signal });
    this.ctlr.config.on("settings.toasts", this.handle, { signal: this.signal });
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.toasts.disabled">): void {
    value && t007?.toast.dismissAll(this.ctlr.config.id);
  }

  protected handle({ type, target: { path, key, value } }: REvent<CtlrConfig, "settings.toasts">): void {
    if (type !== "update" || path?.match(/disabled/) || !t007?.toast) return;
    t007.toast.doForAll("update", { [key]: value }, this.ctlr.config.id);
  }

  public get toast() {
    if (!this.config || this.config.disabled || !t007?.toaster) return null; // after the nuke, ctlr might need me for errors but one of use is the wiser
    return t007.toaster({ groupId: this.ctlr.config.id, rootElement: this.media.container, ...this.config });
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.toasts": typeof ToastsPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    toasts: Toasts;
  }
}

export type * from "./types";
export * from "./build";
