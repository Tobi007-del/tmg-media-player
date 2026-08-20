import { BasePlug } from "../../base";
import { DISABLED_BUILD } from "./build";
import type { DisabledConfig } from "./types";
import type { REvent } from "sia-reactor";
import type { CtlrConfig } from "@defs/config";
import { silence } from "sia-reactor/modules";

export class DisabledPlug extends BasePlug<DisabledConfig> {
  public static readonly plugName = "disabled";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = DISABLED_BUILD;

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
      this.ctlr.plug("settings.overlay")?.show();
      silence(() => (this.media.intent.paused = true));
      this.media.container.classList.add("tmg-media-disabled"), this.media.pseudoContainer.classList.add("tmg-media-disabled"); // #TWINING
      this.ctlr.DOM.containerContent?.setAttribute("inert", "");
      this.ctlr.plug("settings.keys")?.setEventListeners("remove");
      this.ctlr.notice("You cannot access the custom controls when disabled", "warn", null);
    } else {
      this.media.container.classList.remove("tmg-media-disabled"), this.media.pseudoContainer.classList.remove("tmg-media-disabled"); // #TWINING
      this.ctlr.DOM.containerContent?.removeAttribute("inert");
      this.ctlr.plug("settings.keys")?.setEventListeners();
    }
  }

  public deactivate(): void {
    this.ctlr.plug("settings.overlay")?.show();
    const timeline = this.ctlr.plug("settings.controlPanel")?.comp("timeline");
    if (timeline) this.ctlr.setCanvasFallback(timeline["previewCanvas"], timeline["previewContext"]!), this.ctlr.setCanvasFallback(timeline["thumbnailCanvas"], timeline["thumbnailContext"]!);
    this.media.container.classList.add("tmg-media-inactive"), this.media.pseudoContainer.classList.add("tmg-media-inactive"); // #TWINING
  }

  public reactivate(): void {
    t007.dialog?.dismiss(`${this.ctlr.config.id}-error-dialog`, "recovered");
    if (!this.media.container.classList.contains("tmg-media-inactive")) return;
    this.media.container.classList.remove("tmg-media-inactive"), this.media.pseudoContainer.classList.remove("tmg-media-inactive"); // #TWINING
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
