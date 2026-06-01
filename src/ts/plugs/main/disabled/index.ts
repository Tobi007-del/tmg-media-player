import { BasePlug } from "../../base";
import { DISABLED_BUILD } from "./build";
import type { Disabled, DisabledState } from "./types";
import type { Controller } from "@core/controller";
import type { REvent } from "sia-reactor";
import type { CtlrConfig } from "@defs/config";

export class DisabledPlug extends BasePlug<Disabled, DisabledState> {
  public static readonly plugName = "disabled";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = DISABLED_BUILD;

  constructor(ctlr: Controller, config: Disabled = ctlr.config.disabled) {
    super(ctlr, config, { message: "" });
  }

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("disabled", this.handle, { init: true, signal: this.signal });
  }

  protected handle({ value }: REvent<CtlrConfig, "disabled">): void {
    if (value) {
      this.ctlr.plug("settings.settingsView")?.leaveView();
      this.ctlr.cancelAllLoops();
      this.media.container.classList.add("tmg-media-disabled");
      this.media.intent.paused = true;
      this.ctlr.plug("settings.overlay")?.show();
      this.ctlr.DOM.containerContent?.setAttribute("inert", "");
      this.ctlr.plug("settings.keys")?.setEventListeners("remove");
      this.ctlr.plug("settings.toasts")?.toast?.warn("You cannot access the custom controls when disabled");
      this.ctlr.log("You cannot access the custom controls when disabled", "warn");
    } else {
      this.media.container.classList.remove("tmg-media-disabled");
      this.ctlr.DOM.containerContent?.removeAttribute("inert");
      this.ctlr.plug("settings.keys")?.setEventListeners();
    }
  }

  public deactivate(message: string): void {
    this.ctlr.plug("settings.overlay")?.show();
    this.ctlr.DOM.containerContent?.setAttribute("data-message", (this.state.message = message));
    const timeline = this.ctlr.plug("settings.controlPanel")?.ctrl("timeline");
    timeline && this.ctlr.setCanvasFallback(timeline["previewCanvas"], timeline["previewContext"]!);
    timeline && this.ctlr.setCanvasFallback(timeline["thumbnailCanvas"], timeline["thumbnailContext"]!);
    this.media.container.classList.add("tmg-media-inactive");
  }

  public reactivate(): void {
    t007.dialog?.dismiss(`${this.ctlr.config.id}-error-dialog`, "recovered");
    if (!this.media.container.classList.contains("tmg-media-inactive")) return;
    this.state.message = null;
    this.ctlr.DOM.containerContent?.removeAttribute("data-message");
    this.media.container.classList.remove("tmg-media-inactive");
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    disabled: typeof DisabledPlug;
  }
}

declare module "@defs/config" {
  interface CtlrConfig {
    disabled: Disabled;
  }
}
