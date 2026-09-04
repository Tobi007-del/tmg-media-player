import { Controller } from "@core/controller";
import { BasePlug } from "../../base";
import { ModesFullscreenPin } from "./fullscreen";
import { ModesTheaterPin } from "./theater";
import { ModesPictureInPicturePin } from "./pictureInPicture";
import { ModesMiniplayerPin } from "./miniplayer";
import type { ModesConfig } from "./types";
import { MODES_BUILD } from "./build";
import { PinRegistry } from "@core/registries";

export class ModesPlug extends BasePlug<ModesConfig> {
  public static readonly plugName = "modes";
  public static readonly BUILD = MODES_BUILD;
  public fullscreen?: ModesFullscreenPin;
  public theater?: ModesTheaterPin;
  public pictureInPicture?: ModesPictureInPicturePin;
  public miniplayer?: ModesMiniplayerPin;

  constructor(ctlr: Controller, config = ctlr.settings.modes) {
    super(ctlr, config);
    const FullscreenPin = PinRegistry.get("modes.fullscreen"),
      TheaterPin = PinRegistry.get("modes.theater"),
      PictureInPicturePin = PinRegistry.get("modes.pictureInPicture"),
      MiniplayerPin = PinRegistry.get("modes.miniplayer");
    FullscreenPin && (this.fullscreen = new FullscreenPin(this.ctlr, this.config.fullscreen)), TheaterPin && (this.theater = new TheaterPin(this.ctlr, this.config.theater)), PictureInPicturePin && (this.pictureInPicture = new PictureInPicturePin(this.ctlr, this.config.pictureInPicture)), MiniplayerPin && (this.miniplayer = new MiniplayerPin(this.ctlr, this.config.miniplayer));
  }

  public override mount(): void {
    // Utility Injection
    this.fullscreen?.mount?.(), this.theater?.mount?.(), this.pictureInPicture?.mount?.(), this.miniplayer?.mount?.();
  }

  public override wire(): void {
    // Utility Injection
    this.fullscreen?.wire(), this.theater?.wire(), this.pictureInPicture?.wire(), this.miniplayer?.wire();
    // Post Wiring
    this.ctlr.learn("escape", { fn: this.closePopUps, keyboard: { phase: "keydown" } }, this.signal), super.wire();
  }

  public closePopUps(): void {
    if (this.media.state.miniplayer) this.media.intent.miniplayer = false;
    if (this.media.state.pictureInPicture) this.media.intent.pictureInPicture = false;
  }

  protected override onDestroy(): void {
    this.fullscreen?.destroy(), this.theater?.destroy(), this.pictureInPicture?.destroy(), this.miniplayer?.destroy(), super.onDestroy();
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
