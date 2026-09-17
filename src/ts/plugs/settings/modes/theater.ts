import { BasePin } from "../../base";
import { MODES_THEATER_BUILD } from "./build";
import { ModesPlug } from "./index";
import type { ModesTheaterConfig } from "./types";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";

export class ModesTheaterPin extends BasePin<ModesPlug, ModesTheaterConfig> {
  public static readonly pinName = "theater";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_THEATER_BUILD;
  public UISnublist: string[] = ["fullscreen", "miniplayer", "floatingPlayer"]; // #DEFAULT: build privilege

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.watch("settings.modes.theater.disabled", this.syncFeatures, { signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.theater", this.handleTheaterIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    // Post Wiring
    this.ctlr.learn("theater", undefined, this.signal);
  }

  protected handleTheaterIntent(e: REvent<CtlrMedia, "intent.theater">): void {
    if (e.resolved) return;
    if (e.value && this.UISnublist.some(this.ctlr.isUIActive)) return e.stopImmediatePropagation();
    this.media.container.classList.toggle("tmg-media-theater", e.value);
    this.media.state.theater = e.value;
    e.resolve(this.name);
  }

  public syncFeatures(): void {
    this.media.tech.polyfill("theater", true, this.config.disabled);
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.theater": typeof ModesTheaterPin;
  }
}
