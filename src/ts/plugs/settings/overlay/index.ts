import { BasePlug } from "../../base";
import type { OverlayConfig } from "./types";
import { OVERLAY_BUILD } from "./build";
import type { OverlayState } from "./types";
import { Controller } from "@core/controller";
import { IS_MOBILE } from "@utils/env";
import { setTimeout } from "@utils/fn";

export class OverlayPlug extends BasePlug<OverlayConfig, OverlayState> {
  public static readonly plugName = "overlay";
  public static readonly BUILD = OVERLAY_BUILD;
  public overlayDelayId = -1;
  public whitelist: string[] = ["pictureInPicture", "moreSettings", "menuSettings", "controlDragging"]; // #DEFAULT: build privilege

  constructor(ctlr: Controller, config = ctlr.settings.overlay) {
    super(ctlr, config, { visible: false });
  }

  public override wire(): void {
    // Ctlr Media Listeners
    for (const p of ["state.paused", "status.rewindRate"] as const) this.media.on(p, () => this[!this.playing ? "show" : "delay"](), { signal: this.signal });
    this.media.on("state.locked", ({ value }) => (value ? this.hide("force") : this.show()), { init: this.ctlr.flags.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.overlay.curtain.value", ({ value }) => (this.media.container.dataset.curtain = value), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.overlay.behavior.value", ({ value }) => (this.show(), value === "hidden" && this.hide("force")), { init: true, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  public show(): void {
    if (!this.canShow()) return;
    this.media.container.classList.add("tmg-media-overlay");
    this.state.visible = true;
    this.delay();
  }

  public delay(): void {
    clearTimeout(this.overlayDelayId);
    if (this.canHide()) this.overlayDelayId = setTimeout(this.hide, this.config.delay, this.signal);
  }

  public hide(manner?: "force"): void {
    if (!this.canHide(manner)) return;
    this.media.container.classList.remove("tmg-media-overlay");
    this.state.visible = false;
  }

  public canShow(): boolean {
    return this.config.behavior.value !== "hidden" && !this.media.state.locked && !this.ctlr.isUIActive("playerDragging");
  }
  public canHide(manner?: "force"): boolean {
    return this.config.behavior.value !== "persistent" && (manner === "force" || (!this.whitelist.some(this.ctlr.isUIActive) && (IS_MOBILE ? !this.media.status.waiting && this.playing : this.config.behavior.value === "strict" || this.playing) && !this.media.status.teasing));
  }

  protected get playing(): boolean {
    return !this.media.state.paused || !!this.media.status.rewindRate;
  } // might become `media.status.playing`, paused but playing content (e.g. rewinding)
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
    overlay: OverlayConfig;
  }
}
