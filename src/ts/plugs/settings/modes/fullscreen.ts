import { BasePin } from "../../base";
import { MODES_FULLSCREEN_BUILD } from "./build";
import type { ModesFullscreenConfig, OrientationOption } from "./types";
import { ModesPlug } from "./index";
import { TERMINATOR, type REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import { IS_IOS, IS_MOBILE } from "@utils/env";
import { enterFullscreen, exitFullscreen, queryFullscreenEl, supportsFullscreen } from "@utils/dom";
import { isBool, isFunc } from "@utils/obj";
import { silence } from "sia-reactor/modules";

export class ModesFullscreenPin extends BasePin<ModesPlug, ModesFullscreenConfig> {
  public static readonly pinName = "fullscreen";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_FULLSCREEN_BUILD;
  public inFullscreen = false; // a quick notice flag for external deps
  protected shadowFullscreen = false;

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- State --------
    this.ctlr.state.watch("docInFullscreen", this.onDocInFullscreen, { signal: this.signal });
    this.ctlr.state.watch("screenOrientation", this.onScreenOrientation, { signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.fullscreen", this.handleFullscreenIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.set("state.fullscreen", (v) => (v !== this.shadowFullscreen && !IS_IOS ? TERMINATOR : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ---- Config --------
    this.ctlr.config.on("settings.modes.fullscreen.disabled", this.handleDisabled, { init: true, signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("fullscreen", { keyboard: { phase: "keyup" } });
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.modes.fullscreen.disabled">): void {
    this.syncFeatures();
    if (value && this.ctlr.isUIActive("fullscreen")) this.media.intent.fullscreen = false;
  }

  protected handleFullscreenIntent(e: REvent<CtlrMedia, "intent.fullscreen">): void {
    if (e.resolved || IS_IOS) return;
    if (e.value && !this.inFullscreen) {
      const fW = this.ctlr.plug("settings.modes")?.pictureInPicture?.floatingWindow;
      if (this.ctlr.isUIActive("floatingPlayer")) return fW?.addEventListener("pagehide", this.enter, { signal: this.signal }), fW?.close(), e.resolve(this.name);
      if (this.ctlr.isUIActive("pictureInPicture")) silence(() => (this.media.intent.pictureInPicture = false));
      if (this.ctlr.isUIActive("miniplayer")) silence(() => (this.media.intent.miniplayer = false));
      this.enter();
    } else if (this.inFullscreen) {
      exitFullscreen(this.media.container);
      this.inFullscreen = this.shadowFullscreen = false;
    }
    e.resolve(this.name);
  }
  protected async enter(): Promise<void> {
    await enterFullscreen(this.media.container);
    this.inFullscreen = true;
  } // #STANDALONE: needs scoped behavior

  protected onDocInFullscreen(docInFs: boolean): void {
    const inFs = docInFs && queryFullscreenEl() === this.media.container;
    if (inFs) {
      this.media.container.classList.add("tmg-media-fullscreen");
      this.media.state.fullscreen = this.shadowFullscreen = true;
      if (IS_MOBILE) this.changeScreenOrientation(this.config.orientationLock.value);
    } else if (this.ctlr.isUIActive("fullscreen")) {
      this.media.container.classList.remove("tmg-media-fullscreen");
      this.inFullscreen = this.media.intent.locked = false;
      this.ctlr.plug("settings.modes")?.miniplayer?.toggle();
      this.media.state.fullscreen = this.shadowFullscreen = false;
    }
  }

  protected onScreenOrientation(orientation: { angle: number }): void {
    if (!this.ctlr.state.mediaParentIntersecting || !IS_MOBILE || this.ctlr.state.readyState < 3 || this.config.onRotate.value === false || this.ctlr.isUIActive("fullscreen") || this.ctlr.isUIActive("miniplayer")) return; // #PATIENT: only after first play
    const deg = isBool(this.config.onRotate.value) ? 90 : parseInt(this.config.onRotate.value as unknown as string);
    if (orientation.angle === deg || orientation.angle === 360 - deg) this.media.intent.fullscreen = !this.media.state.fullscreen;
  }

  public async changeScreenOrientation(option: boolean | OrientationOption = true): Promise<void> {
    const orientation = screen.orientation as any;
    option === false ? orientation?.unlock?.() : await orientation?.lock?.(option === "auto" ? (this.media.status.videoHeight > this.media.status.videoWidth ? "portrait" : "landscape") : option !== true ? option : orientation?.angle === 0 ? "landscape" : "portrait");
  }

  public syncFeatures(): void {
    if (this.config.disabled) return void (this.media.features.fullscreen = this.media.features.fullscreenOrientation = false);
    this.media.features.fullscreen ||= supportsFullscreen();
    this.media.features.fullscreenOrientation ||= this.media.features.fullscreen && IS_MOBILE && isFunc(screen.orientation?.lock);
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.fullscreen": typeof ModesFullscreenPin;
  }
}

declare module "@defs/contract" {
  interface MediaExtraFeatures {
    fullscreenOrientation: boolean;
  }
}
