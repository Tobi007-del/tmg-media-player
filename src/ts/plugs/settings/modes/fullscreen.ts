import { BasePin } from "../../base";
import { MODES_FULLSCREEN_BUILD } from "./build";
import type { ModesFullscreenConfig } from "./types";
import { ModesPlug } from "./index";
import { NOOP, TERMINATOR, type REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import { IS_IOS, IS_MOBILE } from "@utils/env";
import { enterFullscreen, exitFullscreen, queryFullscreenEl, supportsFullscreen } from "@utils/dom";
import { initFocusTrap, removeFocusTrap } from "@t007/utils/hooks/vanilla";
import { isFunc } from "@utils/obj";
import { silence } from "sia-reactor/modules";
import { connectOrientationManager, CtlrState, disconnectOrientationManager } from "@tools/runtime";
import { Controller } from "@core/controller";

export class ModesFullscreenPin extends BasePin<ModesPlug, ModesFullscreenConfig> {
  public static readonly pinName = "fullscreen";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_FULLSCREEN_BUILD;
  public inFullscreen = false; // a quick notice flag for external deps
  protected shadowFullscreen = false;

  constructor(ctlr: Controller, config = ctlr.settings.modes.fullscreen) {
    super(ctlr, config, { snubbingAutoFullscreenOrientationIntent: false });
  }

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- State --------
    this.ctlr.state.watch("docInFullscreen", this.onDocInFullscreen, { signal: this.signal });
    // ---- State Listeners
    this.ctlr.state.on("screenOrientation.type", this.handleScreenOrientationType, { signal: this.signal });
    // ---- Media Setters
    this.media.set("state.fullscreen", (v) => (v !== this.shadowFullscreen && !IS_IOS ? TERMINATOR : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ---------- Watchers
    this.media.watch("state.fullscreenOrientation", this.onScreenOrientation, { signal: this.signal });
    // ---------- Listeners
    this.media.on("intent.fullscreen", this.handleFullscreenIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.fullscreenOrientation", this.handleFullscreenOrientationIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.autoFullscreenOrientation", this.handleAutoFullscreenOrientationIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.fullscreen", this.syncFeatures, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.modes.fullscreen.disabled", this.handleDisabled, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.modes.fullscreen.pseudo", this.handlePseudo, { signal: this.signal });
    this.ctlr.config.on("settings.modes.fullscreen.orientation.allowMediaOverride", ({ value }) => value && this.media.state.fullscreen && (this.media.intent.fullscreenOrientation = this.preferredOrientation), { signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("fullscreen", { keyboard: { phase: "keyup" } });
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.modes.fullscreen.disabled">): void {
    this.syncFeatures();
    if (value && this.ctlr.isUIActive("fullscreen")) this.media.intent.fullscreen = false;
  }
  protected handlePseudo(): void {
    this.syncFeatures();
    this.media.state.fullscreen && silence(() => ((this.media.intent.fullscreen = false), this.media.wonce("state.fullscreen", () => (this.media.intent.fullscreen = true), { signal: this.signal })));
  }

  protected handleFullscreenIntent(e: REvent<CtlrMedia, "intent.fullscreen">): void {
    if (e.resolved || (IS_IOS && !this.config.pseudo)) return e.reject(this.name); // over to u, native tech!
    if (e.value && !this.inFullscreen) {
      const fW = this.ctlr.plug("settings.modes")?.pictureInPicture?.floatingWindow;
      if (this.ctlr.isUIActive("floatingPlayer")) return fW?.addEventListener("pagehide", this.enter, { signal: this.signal }), fW?.close(), e.resolve(this.name);
      if (this.ctlr.isUIActive("pictureInPicture")) silence(() => (this.media.intent.pictureInPicture = false));
      if (this.ctlr.isUIActive("miniplayer")) silence(() => (this.media.intent.miniplayer = false));
      this.enter();
    } else if (!e.value && this.inFullscreen) {
      !this.media.container.matches(":fullscreen") ? this.onDocInFullscreen(false) : exitFullscreen(this.media.container);
      this.inFullscreen = false;
    }
    e.resolve(this.name);
  }
  protected async enter(): Promise<void> {
    this.config.pseudo ? this.onDocInFullscreen(true) : await enterFullscreen(this.media.container);
    this.inFullscreen = true;
  } // #STANDALONE: needs scoped behavior

  protected handleFullscreenOrientationIntent(e: REvent<CtlrMedia, "intent.fullscreenOrientation">): void {
    if (e.resolved) return;
    this.changeScreenOrientation(e.value);
    this.media.state.fullscreenOrientation = e.value; // UX boost
    this.media.state.autoFullscreenOrientation = false;
    e.resolve(this.name);
  }

  protected handleAutoFullscreenOrientationIntent(e: REvent<CtlrMedia, "intent.autoFullscreenOrientation">): void {
    if ((this.state.snubbingAutoFullscreenOrientationIntent = !!e.resolved)) return;
    e.value ? connectOrientationManager() : disconnectOrientationManager();
    this.media.state.autoFullscreenOrientation = e.value;
    e.resolve(this.name);
  }

  protected handleScreenOrientationType({ value: type }: REvent<CtlrState, "screenOrientation.type">): void {
    if (this.media.state.fullscreen) this.media.state.fullscreenOrientation = this.lockedScreen ? type : false;
    this.onScreenOrientation(type), !this.state.snubbingAutoFullscreenOrientationIntent && this.media.state.autoFullscreenOrientation && this.changeScreenOrientation(type);
  }

  protected onDocInFullscreen(docInFs: boolean): void {
    if (docInFs && (this.config.pseudo || queryFullscreenEl() === this.media.container)) {
      this.media.container.classList.toggle("tmg-media-fullscreen", (this.inFullscreen = true));
      this.media.state.fullscreen = this.shadowFullscreen = true;
      silence((auto = this.media.state.autoFullscreenOrientation) => ((this.media.intent.fullscreenOrientation = this.preferredOrientation), (this.media.intent.autoFullscreenOrientation = auto)));
      this.config.pseudo && initFocusTrap(this.media.container, { enabled: true });
    } else if (this.ctlr.isUIActive("fullscreen")) {
      this.media.container.classList.toggle("tmg-media-fullscreen", (this.inFullscreen = false));
      silence(() => (this.media.intent.locked = false));
      this.ctlr.plug("settings.modes")?.miniplayer?.toggle();
      this.lockedScreen = this.media.state.fullscreen = this.shadowFullscreen = false;
      removeFocusTrap(this.media.container);
    }
  }

  protected onScreenOrientation(type: OrientationType | false): void {
    if ((!this.media.state.fullscreen && (this.ctlr.state.readyState < 3 || !this.ctlr.state.mediaParentIntersecting)) || this.ctlr.isUIActive("miniplayer")) return; // #PATIENT: only after first play
    const target = !this.media.state.fullscreen ? this.config.orientation.rotationToggle.on.value : this.config.orientation.rotationToggle.off.value;
    if (target && type === target) this.media.intent.fullscreen = !this.media.state.fullscreen;
  }

  public get preferredOrientation() {
    return this.config.orientation.allowMediaOverride ? (this.media.status.videoHeight > this.media.status.videoWidth ? "portrait-primary" : "landscape-primary") : this.media.state.fullscreenOrientation;
  }
  public async changeScreenOrientation(option: OrientationType | false): Promise<void> {
    if (this.media.state.fullscreen) (this.lockedScreen = !!option), option === false ? screen.orientation?.unlock?.() : await screen.orientation?.lock?.(option)?.catch(NOOP);
  }
  private lockedScreen = false;

  public syncFeatures(): void {
    if (this.config.disabled) return void (this.media.features.autoFullscreenOrientation = this.media.features.fullscreenOrientation = this.media.features.fullscreen = false);
    if (this.config.pseudo) return void (this.media.features.autoFullscreenOrientation = this.media.features.fullscreenOrientation = !(this.media.features.fullscreen = true));
    this.media.features.fullscreen ||= supportsFullscreen(false);
    if (this.media.state.fullscreen) (this.media.features.fullscreenOrientation ||= IS_MOBILE && this.media.features.fullscreen && isFunc(screen.orientation?.lock)), (this.media.features.autoFullscreenOrientation ||= this.media.features.fullscreenOrientation);
    else this.media.features.autoFullscreenOrientation = this.media.features.fullscreenOrientation = false;
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.fullscreen": typeof ModesFullscreenPin;
  }
}
