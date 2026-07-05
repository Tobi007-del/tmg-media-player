import { BasePin } from "../../base";
import { MODES_THEATER_BUILD } from "./build";
import { ModesPlug } from "./index";
import type { ModesTheaterConfig } from "./types";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";

export class ModesTheaterPin extends BasePin<ModesPlug, ModesTheaterConfig> {
  public static readonly pinName = "theater";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_THEATER_BUILD;

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.theater", this.handleTheaterIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    // ---- Config ---------
    this.ctlr.config.on("settings.modes.theater.disabled", this.handleDisabled, { init: true, signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("theater", { keyboard: { phase: "keyup" } });
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.modes.theater.disabled">): void {
    this.syncFeatures();
    if (value && this.ctlr.isUIActive("theater")) this.media.intent.theater = false;
  }

  protected handleTheaterIntent(e: REvent<CtlrMedia, "intent.theater">): void {
    if (e.resolved || (e.value && (this.ctlr.isUIActive("fullscreen") || this.ctlr.isUIActive("miniplayer") || this.ctlr.isUIActive("floatingPlayer")))) return;
    this.media.container.classList.toggle("tmg-media-theater", e.value);
    this.media.state.theater = e.value;
    e.resolve(this.name);
  }

  public syncFeatures(): void {
    if (this.config.disabled) return void (this.media.features.theater = false);
    this.media.features.theater ||= true;
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.theater": typeof ModesTheaterPin;
  }
}
