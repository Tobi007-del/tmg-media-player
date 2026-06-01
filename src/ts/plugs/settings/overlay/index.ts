import { BasePlug } from "../../base";
import type { Overlay } from "./types";
import { OVERLAY_BUILD } from "./build";
import type { OverlayState } from "./types";
import { Controller } from "@core/controller";
import type { CtlrConfig } from "@defs/config";
import { type REvent } from "sia-reactor";
import { IS_MOBILE } from "@utils/browser";
import { setTimeout } from "@utils/fn";

export class OverlayPlug extends BasePlug<Overlay, OverlayState> {
  public static readonly plugName = "overlay";
  public static readonly BUILD = OVERLAY_BUILD;
  public overlayDelayId = -1;

  constructor(ctlr: Controller, config: Overlay = ctlr.config.settings.overlay) {
    super(ctlr, config, { visible: false });
  }

  public override wire(): void {
    // Ctlr Media Listeners
    this.media.on("state.paused", ({ value }) => (value ? this.show() : this.delay()), { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.overlay.curtain", this.handleCurtain, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.overlay.behavior", this.handleBehavior, { init: true, signal: this.signal });
  }

  protected handleCurtain({ value }: REvent<CtlrConfig, "settings.overlay.curtain">): void {
    this.media.container.dataset.curtain = value;
  }

  protected handleBehavior({ value }: REvent<CtlrConfig, "settings.overlay.behavior">): void {
    value === "persistent" && this.show(), value === "hidden" && this.remove("force");
  }

  public shouldShow(): boolean {
    return this.config.behavior !== "hidden" && this.ctlr.settings.locked.disabled && !this.ctlr.isUIActive("playerDragging");
  }
  public shouldRemove(manner?: "force"): boolean {
    return this.config.behavior !== "persistent" && (manner === "force" || (!this.ctlr.isUIActive("pictureInPicture") && !this.ctlr.isUIActive("settings") && (IS_MOBILE ? !this.media.status.waiting && !this.media.state.paused : this.config.behavior === "strict" ? true : !this.media.state.paused)));
  }

  public show(): void {
    if (!this.shouldShow()) return;
    this.media.container.classList.add("tmg-media-overlay");
    this.state.visible = true;
    this.delay();
  }

  public delay(): void {
    clearTimeout(this.overlayDelayId);
    if (this.shouldRemove()) this.overlayDelayId = setTimeout(this.remove, this.config.delay, this.signal);
  }

  public remove(manner?: "force"): void {
    if (this.shouldRemove(manner)) {
      this.media.container.classList.remove("tmg-media-overlay");
      this.state.visible = false;
    }
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.overlay": typeof OverlayPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    overlay: Overlay;
  }
}
