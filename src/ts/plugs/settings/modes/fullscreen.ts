import { BasePin } from "../../base";
import { MODES_FULLSCREEN_BUILD } from "./build";
import type { ModesFullscreenConfig } from "./types";
import { ModesPlug } from "./index";
import { NOOP, TERMINATOR, type REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
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
  public isActive = false; // a quick notice flag
  protected shadowFullscreen = false;

  constructor(ctlr: Controller, config = ctlr.settings.modes.fullscreen) {
    super(ctlr, config, { snubbingAutoFullscreenOrientation: false });
  }

  public override wire(): void {
    // Ctlr Media Setters
    this.media.set("state.fullscreen", (v) => (v !== this.shadowFullscreen && !IS_IOS ? TERMINATOR : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ----------- Watchers
    for (const p of ["tech", "state.fullscreen"] as const) this.media.watch(p, this.syncFeatures, { init: p === "tech", signal: this.signal });
    this.media.watch("state.fullscreenOrientation", this.onScreenOrientation, { signal: this.signal });
    // ---- State --------
    this.ctlr.state.watch("docInFullscreen", this.onDocInFullscreen, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.watch("settings.modes.fullscreen.disabled", this.syncFeatures, { signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.fullscreen", this.handleFullscreenIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.fullscreenOrientation", this.handleFullscreenOrientationIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.autoFullscreenOrientation", this.handleAutoFullscreenOrientationIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    // ---- State --------
    this.ctlr.state.on("screenOrientation.type", this.handleScreenOrientationType, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.modes.fullscreen.pseudo", this.handlePseudo, { signal: this.signal });
    this.ctlr.config.on("settings.modes.fullscreen.orientation.allowMediaOverride", ({ value }) => value && this.media.state.fullscreen && (this.media.intent.fullscreenOrientation = this.preferredOrientation), { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("fullscreen", undefined, this.signal);
  }

  protected handlePseudo(): void {
    this.syncFeatures();
    this.media.state.fullscreen && silence(() => ((this.media.intent.fullscreen = false), this.media.wonce("state.fullscreen", () => (this.media.intent.fullscreen = true), { signal: this.signal })));
  }

  protected handleFullscreenIntent(e: REvent<CtlrMedia, "intent.fullscreen">): void {
    if (e.resolved || (IS_IOS && !this.config.pseudo)) return void (!e.resolved && e.reject(this.name)); // over to u, native tech!
    if (e.value && !this.isActive) {
      const fW = this.ctlr.plug("settings.modes")?.pictureInPicture?.floatingWindow;
      if (this.ctlr.isUIActive("floatingPlayer")) return fW?.addEventListener("pagehide", this.enter, { signal: this.signal }), fW?.close(), e.resolve(this.name);
      if (this.media.state.pictureInPicture) silence(() => (this.media.intent.pictureInPicture = false));
      if (this.media.state.miniplayer) silence(() => (this.media.intent.miniplayer = false));
      this.enter();
    } else if (!e.value && this.isActive) {
      !this.media.container.matches(":fullscreen") ? this.onDocInFullscreen(false) : exitFullscreen(this.media.container);
      this.isActive = false;
    }
    e.resolve(this.name);
  }
  protected async enter(): Promise<void> {
    this.config.pseudo ? this.onDocInFullscreen(true) : await enterFullscreen(this.media.container);
    this.isActive = true;
  } // #STANDALONE: needs scoped behavior

  protected handleFullscreenOrientationIntent(e: REvent<CtlrMedia, "intent.fullscreenOrientation">): void {
    if (e.resolved) return;
    this.useAutoFullScreenOrientation(), this.changeScreenOrientation(e.value); // #BULLET-PROOF: must comes clutch
    e.resolve(this.name);
  }

  protected handleAutoFullscreenOrientationIntent(e: REvent<CtlrMedia, "intent.autoFullscreenOrientation">): void {
    if ((this.state.snubbingAutoFullscreenOrientation = !!e.resolved)) return;
    this.useAutoFullScreenOrientation(e.value);
    e.resolve(this.name);
  }
  protected useAutoFullScreenOrientation(value = false): void {
    value ? connectOrientationManager() : disconnectOrientationManager();
    this.media.state.autoFullscreenOrientation = value;
  }

  protected handleScreenOrientationType({ value: type }: REvent<CtlrState, "screenOrientation.type">): void {
    if (this.media.state.fullscreen) this.media.state.fullscreenOrientation = this.ctlr.state.screenOrientation.locked ? type : false;
    !this.ctlr.state.screenOrientation.locked && this.onScreenOrientation(type);
  }

  protected onDocInFullscreen(docInFs: boolean): void {
    if (docInFs && (this.config.pseudo || queryFullscreenEl() === this.media.container)) {
      this.media.container.classList.toggle("tmg-media-fullscreen", (this.isActive = true));
      this.media.state.fullscreen = this.shadowFullscreen = true;
      silence((auto = this.media.state.autoFullscreenOrientation) => ((this.media.intent.fullscreenOrientation = this.preferredOrientation), (this.media.intent.autoFullscreenOrientation = auto)));
      this.config.pseudo && initFocusTrap(this.media.container, { enabled: true });
    } else if (this.ctlr.isUIActive("fullscreen")) {
      this.media.container.classList.toggle("tmg-media-fullscreen", (this.isActive = false));
      silence(() => (this.media.intent.locked = false)), disconnectOrientationManager();
      this.ctlr.state.screenOrientation.locked = this.media.state.fullscreen = this.shadowFullscreen = false;
      removeFocusTrap(this.media.container), this.ctlr.plug("settings.modes")?.miniplayer?.toggle();
    }
  }

  protected onScreenOrientation(type: OrientationType | false): void {
    !this.state.snubbingAutoFullscreenOrientation && this.media.state.autoFullscreenOrientation && this.changeScreenOrientation(type);
    if ((!this.media.state.fullscreen && (!this.ctlr.flags.played || !this.ctlr.state.parentIntersecting)) || this.media.state.miniplayer) return; // #PATIENT: only after first play
    const target = !this.media.state.fullscreen ? this.config.orientation.rotationToggle.on.value : this.config.orientation.rotationToggle.off.value;
    if (target && type === target) this.media.intent.fullscreen = !this.media.state.fullscreen;
  }

  public get preferredOrientation() {
    return this.config.orientation.allowMediaOverride && this.media.status.loadedMetadata ? (this.media.status.videoHeight > this.media.status.videoWidth ? "portrait" : "landscape") : this.media.intent.fullscreenOrientation; // #I/S EXCEPTION: state is not desire
  }
  public async changeScreenOrientation(option: OrientationLockType | false): Promise<void> {
    if (this.media.state.fullscreen) (this.ctlr.state.screenOrientation.locked = !!option), option === false ? screen.orientation?.unlock?.() : await screen.orientation?.lock?.(option)?.catch(NOOP);
  }

  public syncFeatures(): void {
    this.media.tech.polyfill("fullscreen", this.config.pseudo || supportsFullscreen(false), this.config.disabled);
    this.media.tech.polyfill(["fullscreenOrientation", "autoFullscreenOrientation"], !this.config.pseudo && this.media.features.fullscreen && this.media.state.fullscreen && IS_MOBILE && isFunc(screen.orientation?.lock));
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.fullscreen": typeof ModesFullscreenPin;
  }
}
