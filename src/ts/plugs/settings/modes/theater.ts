import { BasePin } from "../../base";
import { MODES_THEATER_BUILD } from "./build";
import { ModesPlug } from "./index";
import type { ModesTheater } from "./types";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";

export class ModesTheaterPin extends BasePin<ModesPlug, ModesTheater> {
  public static readonly pinName = "theater";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_THEATER_BUILD;

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.modes.theater.disabled", this.handleDisabled, { init: true, signal: this.signal });
    // ---- Media --------
    this.media.on("tech", () => !this.config.disabled && (this.media.features.theater ||= true), { signal: this.signal });
    this.media.on("intent.theater", this.handleTheaterIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    // Post Wiring
    this.ctlr.plug("settings.keys")?.register("theater", () => !this.ctlr.isUIActive("fullscreen") && !this.ctlr.isUIActive("miniplayer") && !this.ctlr.isUIActive("floatingPlayer") && (this.media.intent.theater = !this.media.state.theater), { phase: "keyup" });
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.modes.theater.disabled">): void {
    this.media.features.theater = !value;
    if (value && this.ctlr.isUIActive("theater")) this.media.intent.theater = false;
  }

  protected handleTheaterIntent(e: REvent<CtlrMedia, "intent.theater">): void {
    if (e.resolved) return;
    if (this.config.disabled && !this.ctlr.isUIActive("theater")) return e.resolve(this.name);
    this.media.container.classList.toggle("tmg-media-theater", e.value);
    this.media.state.theater = e.value;
    e.resolve(this.name);
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.theater": typeof ModesTheaterPin;
  }
}
