import { BasePlug } from "../../base";
import { DISABLED_BUILD } from "./build";
import type { DisabledConfig, DisabledState } from "./types";
import type { Controller } from "@core/controller";
import type { REvent } from "sia-reactor";
import type { CtlrConfig } from "@defs/config";
import { silence } from "sia-reactor/modules";

export class DisabledPlug extends BasePlug<DisabledConfig, DisabledState> {
  public static readonly plugName = "disabled";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = DISABLED_BUILD;

  constructor(ctlr: Controller, config = ctlr.config.disabled) {
    super(ctlr, config, { message: "" });
  }

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("disabled", this.handle, { init: true, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handle({ value }: REvent<CtlrConfig, "disabled">): void {
    if (value) {
      this.ctlr.plug("settings.settingsView")?.leaveView();
      this.ctlr.cancelAllLoops();
      this.media.container.classList.add("tmg-media-disabled");
      silence(() => (this.media.intent.paused = true));
      this.ctlr.plug("settings.overlay")?.show();
      this.ctlr.DOM.containerContent?.setAttribute("inert", "");
      this.ctlr.plug("settings.keys")?.setEventListeners("remove");
      this.ctlr.notice("You cannot access the custom controls when disabled", "warn", null);
    } else {
      this.media.container.classList.remove("tmg-media-disabled");
      this.ctlr.DOM.containerContent?.removeAttribute("inert");
      this.ctlr.plug("settings.keys")?.setEventListeners();
    }
  }

  public deactivate(message: string): void {
    this.ctlr.plug("settings.overlay")?.show();
    this.ctlr.DOM.containerContent?.setAttribute("data-message", (this.state.message = message));
    const timeline = this.ctlr.plug("settings.controlPanel")?.comp("timeline");
    if (timeline) this.ctlr.setCanvasFallback(timeline["previewCanvas"], timeline["previewContext"]!), this.ctlr.setCanvasFallback(timeline["thumbnailCanvas"], timeline["thumbnailContext"]!);
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
    disabled: DisabledConfig;
  }
}
