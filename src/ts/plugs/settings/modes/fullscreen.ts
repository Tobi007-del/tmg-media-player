import { BasePin } from "../../base";
import { MODES_FULLSCREEN_BUILD } from "./build";
import type { ModesFullscreen } from "./types";
import { ModesPlug } from "./index";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import type { OrientationOption } from "@defs/generics";
import { IS_MOBILE } from "@utils/browser";
import { enterFullscreen, exitFullscreen, queryFullscreenEl, supportsFullscreen } from "@utils/dom";
import { isBool } from "@utils/obj";

export class ModesFullscreenPin extends BasePin<ModesPlug, ModesFullscreen> {
  public static readonly pinName = "fullscreen";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_FULLSCREEN_BUILD;
  public inFullscreen = false; // a quick notice flag for external deps

  public override wire(): void {
    // Ctlr State Watchers
    this.ctlr.state.watch("docInFullscreen", this.handleDocInFullscreen, { signal: this.signal });
    this.ctlr.state.watch("screenOrientation", this.handleScreenOrientation, { signal: this.signal });
    // ---- Config Listeners
    this.ctlr.config.on("settings.modes.fullscreen.disabled", this.handleDisabled, { init: true, signal: this.signal });
    // ---- Media --------
    this.media.on("tech", () => !this.config.disabled && (this.media.features.fullscreen ||= supportsFullscreen()), { signal: this.signal });
    this.media.on("intent.fullscreen", this.handleFullscreenIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    // Post Wiring
    this.ctlr.plug("settings.keys")?.register("fullscreen", () => (this.media.intent.fullscreen = !this.media.state.fullscreen), { phase: "keyup" });
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.modes.fullscreen.disabled">): void {
    this.media.features.fullscreen = !value && supportsFullscreen();
    if (value && this.ctlr.isUIActive("fullscreen")) this.media.intent.fullscreen = false;
  }

  protected handleFullscreenIntent(e: REvent<CtlrMedia, "intent.fullscreen">): void {
    if (e.resolved) return;
    if (this.config.disabled && !this.inFullscreen) return e.resolve(this.name);
    if (e.value && !this.inFullscreen) {
      const fW = this.ctlr.plug("settings.modes")?.pictureInPicture?.floatingWindow;
      if (this.ctlr.isUIActive("floatingPlayer")) return fW?.addEventListener("pagehide", this._enter, { signal: this.signal }), fW?.close(), e.resolve(this.name);
      if (this.ctlr.isUIActive("pictureInPicture")) this.media.intent.pictureInPicture = false;
      this.media.intent.miniplayer = false;
      this._enter();
    } else if (this.inFullscreen) {
      exitFullscreen(this.media.container);
      this.inFullscreen = false;
    }
    e.resolve(this.name);
  }
  protected async _enter(): Promise<void> {
    await enterFullscreen(this.media.container);
    this.inFullscreen = true;
  } // #STANDALONE: needs scoped behavior

  protected async handleDocInFullscreen(docInFs: boolean): Promise<void> {
    const inFs = docInFs && queryFullscreenEl() === this.media.container;
    if (inFs) {
      this.media.container.classList.add("tmg-media-fullscreen");
      this.media.state.fullscreen = true;
    } else if (this.ctlr.isUIActive("fullscreen")) {
      this.media.container.classList.remove("tmg-media-fullscreen");
      this.ctlr.settings.locked.disabled = true;
      this.inFullscreen = false;
      this.ctlr.plug("settings.modes")?.miniplayer?.toggle();
      this.media.state.fullscreen = false;
    }
    if (IS_MOBILE) await this.changeScreenOrientation(inFs ? this.config.orientationLock : false);
  }

  protected handleScreenOrientation(orientation: { angle: number }): void {
    if (!this.ctlr.state.mediaParentIntersecting || !IS_MOBILE || this.ctlr.state.readyState < 3 || this.config.onRotate === false || this.ctlr.isUIActive("fullscreen") || this.ctlr.isUIActive("miniplayer")) return;
    const deg = isBool(this.config.onRotate) ? 90 : parseInt(String(this.config.onRotate));
    if (orientation.angle === deg || orientation.angle === 360 - deg) this.media.intent.fullscreen = !this.media.state.fullscreen;
  }

  public async changeScreenOrientation(option: boolean | OrientationOption = true): Promise<void> {
    const orientation = screen.orientation as any;
    if (option === false) return void orientation?.unlock?.();
    await orientation?.lock?.(option === "auto" ? (this.media.status.videoHeight > this.media.status.videoWidth ? "portrait" : "landscape") : option === true ? (orientation.angle === 0 ? "landscape" : "portrait") : (option as OrientationOption));
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.fullscreen": typeof ModesFullscreenPin;
  }
}
