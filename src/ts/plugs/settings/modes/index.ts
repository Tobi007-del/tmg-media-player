import { Controller } from "@core/controller";
import { BasePlug } from "../../base";
import type { ModesConfig } from "./types";
import { MODES_BUILD } from "./build";
import { ModesFullscreenPin } from "./fullscreen";
import { ModesTheaterPin } from "./theater";
import { ModesPictureInPicturePin } from "./pictureInPicture";
import { ModesMiniplayerPin } from "./miniplayer";
import { ModesCastPin } from "./cast";
import { ModesAirPlayPin } from "./airplay";
import { PinRegistry } from "@core/registries";

export class ModesPlug extends BasePlug<ModesConfig> {
  public static readonly plugName = "modes";
  public static readonly BUILD = MODES_BUILD;
  public fullscreen?: ModesFullscreenPin;
  public theater?: ModesTheaterPin;
  public pictureInPicture?: ModesPictureInPicturePin;
  public miniplayer?: ModesMiniplayerPin;
  public cast?: ModesCastPin;
  public airplay?: ModesAirPlayPin;

  constructor(ctlr: Controller, config = ctlr.settings.modes) {
    super(ctlr, config);
    // prettier-ignore
    const FP = PinRegistry.get("modes.fullscreen"), TP = PinRegistry.get("modes.theater"), PP = PinRegistry.get("modes.pictureInPicture"), MP = PinRegistry.get("modes.miniplayer"), CP = PinRegistry.get("modes.cast"), AP = PinRegistry.get("modes.airplay");
    FP && (this.fullscreen = new FP(this.ctlr, this.config.fullscreen)), TP && (this.theater = new TP(this.ctlr, this.config.theater)), PP && (this.pictureInPicture = new PP(this.ctlr, this.config.pictureInPicture)), MP && (this.miniplayer = new MP(this.ctlr, this.config.miniplayer)), CP && (this.cast = new CP(this.ctlr, this.config.cast)), AP && (this.airplay = new AP(this.ctlr, this.config.airplay));
  }

  public override mount(): void {
    // Utility Injection
    for (const pin of [this.fullscreen, this.theater, this.pictureInPicture, this.miniplayer, this.cast, this.airplay]) pin?.mount?.();
  }

  public override wire(): void {
    // Utility Injection
    for (const pin of [this.fullscreen, this.theater, this.pictureInPicture, this.miniplayer, this.cast, this.airplay]) pin?.wire();
    // Post Wiring
    this.ctlr.learn("escape", { fn: this.closePopUps, keyboard: { phase: "keydown" } }, this.signal), super.wire();
  }

  public closePopUps(): void {
    if (this.media.state.miniplayer) this.media.intent.miniplayer = false;
    if (this.media.state.pictureInPicture) this.media.intent.pictureInPicture = false;
  }

  protected override onDestroy(): void {
    for (const pin of [this.fullscreen, this.theater, this.pictureInPicture, this.miniplayer, this.cast, this.airplay]) pin?.destroy();
    super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";
export * from "./fullscreen";
export * from "./theater";
export * from "./pictureInPicture";
export * from "./miniplayer";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.modes": typeof ModesPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    modes: ModesConfig;
  }
}
