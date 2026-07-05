import { BasePin } from "../../base";
import { MODES_MINIPLAYER_BUILD } from "./build";
import type { ModesMiniplayerConfig } from "./types";
import { ModesPlug } from "./index";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import { inDocView, getWindow } from "@utils/dom";
import { setTimeout } from "@utils/fn";
import { clamp } from "@utils/num";
import { INTERACTIVE_SELECTOR } from "@t007/utils";
import { silence } from "sia-reactor/modules";

export class ModesMiniplayerPin extends BasePin<ModesPlug, ModesMiniplayerConfig> {
  public static readonly pinName = "miniplayer";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_MINIPLAYER_BUILD;
  protected lastMiniplayerPosX = 0;
  protected lastMiniplayerPosY = 0;
  protected lastMiniplayerPtrX = 0;
  protected lastMiniplayerPtrY = 0;
  protected nextMiniplayerX = "";
  protected nextMiniplayerY = "";
  protected wildMiniplayerX = "";
  protected wildMiniplayerY = "";

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- State --------
    this.ctlr.state.watch("dimensions.window.width", () => !this.ctlr.isUIActive("fullscreen") && this.toggle(), { signal: this.signal });
    // ---- Media  Listeners
    this.media.on("intent.miniplayer", this.handleMiniplayerIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.paused", ({ value }) => !value && this.toggle(), { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- State --------
    this.ctlr.state.on("mediaParentIntersecting", () => this.ctlr.payload.wired && this.toggle(), { signal: this.signal }); // #HEAVY: waits for !lightState
    // ---- Config --------
    this.ctlr.config.on("settings.modes.miniplayer.disabled", this.handleDisabled, { init: true, signal: this.signal });
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.modes.miniplayer.disabled">): void {
    this.syncFeatures();
    if (value && this.ctlr.isUIActive("miniplayer")) this.media.intent.miniplayer = false;
  }

  protected handleMiniplayerIntent(e: REvent<CtlrMedia, "intent.miniplayer">): void {
    if (e.resolved) return;
    const active = this.ctlr.isUIActive("miniplayer");
    e.value && !active ? this.enter() : active && this.exit();
    e.resolve(this.name); // btw this is a smart behavioral implementation rather than just a toggler
  }

  protected enter(): void {
    this.ctlr.plug("skeleton")?.enterPseudoMode();
    this.media.container.classList.add("tmg-media-miniplayer", "tmg-media-progress-bar"), this.media.pseudoContainer.classList.add("tmg-media-in-miniplayer");
    for (const type of ["mousedown", "touchstart"]) this.media.container.addEventListener(type, this.handleDragStart, { signal: this.signal });
    this.media.state.miniplayer = true;
  } // #STANDALONE: partner courtesy

  protected exit(behavior?: ScrollBehavior): void {
    if (behavior && inDocView(this.media.pseudoContainer)) this.media.pseudoContainer.scrollIntoView({ behavior, block: "center", inline: "center" });
    this.ctlr.plug("skeleton")?.leavePseudoMode();
    this.media.container.classList.remove("tmg-media-miniplayer"), this.media.pseudoContainer.classList.remove("tmg-media-in-miniplayer");
    this.media.container.classList.toggle("tmg-media-progress-bar", this.settings.controlPanel.progressBar);
    for (const type of ["mousedown", "touchstart"]) this.media.container.removeEventListener(type, this.handleDragStart);
    this.media.state.miniplayer = false;
  } // #STANDALONE: needs scoped behavior
  public expand(): void {
    this.media.container.classList.contains("tmg-media-miniplayer") && this.exit("smooth");
  }
  public remove(): void {
    silence(() => (this.media.intent.paused = true)), this.exit();
  }

  public toggle(bool?: boolean): void {
    const active = this.ctlr.isUIActive("miniplayer");
    if (!active && (bool === true || this.shouldEnter())) this.media.intent.miniplayer = true;
    else if (active && (bool === false || this.shouldExit())) this.media.intent.miniplayer = false;
  }
  public shouldEnter(): boolean {
    const modes = this.ctlr.plug("settings.modes");
    return !this.ctlr.isUIActive("pictureInPicture") && !modes?.pictureInPicture?.inFloatingPlayer && !modes?.fullscreen?.inFullscreen && !this.ctlr.state.mediaParentIntersecting && getWindow(this.media.container).innerWidth >= this.config.minWindowWidth && !this.media.state.paused;
  }
  public shouldExit(): boolean {
    return this.ctlr.state.mediaParentIntersecting || getWindow(this.media.container).innerWidth < this.config.minWindowWidth;
  }

  protected handleDragStart(e: globalThis.Event): void {
    const target = e.target as HTMLElement,
      clientX = (e as MouseEvent).clientX ?? (e as TouchEvent).targetTouches?.[0]?.clientX ?? 0,
      clientY = (e as MouseEvent).clientY ?? (e as TouchEvent).targetTouches?.[0]?.clientY ?? 0;
    if (!this.ctlr.isUIActive("miniplayer") || target.scrollWidth >= target.clientWidth + 3 || [this.ctlr.DOM.topControlsWrapper, this.ctlr.DOM.bottomControlsWrapper, this.ctlr.DOM.captionsContainer].some((w) => w?.contains(target)) || target.closest(`:is(${INTERACTIVE_SELECTOR},[class$='toast-container'])`)) return;
    const { left, bottom } = getComputedStyle(this.media.container);
    (this.lastMiniplayerPosX = parseFloat(left)), (this.lastMiniplayerPosY = parseFloat(bottom));
    (this.lastMiniplayerPtrX = clientX), (this.lastMiniplayerPtrY = clientY);
    (this.nextMiniplayerX = this.settings.css.currentMiniplayerX as string), (this.nextMiniplayerY = this.settings.css.currentMiniplayerY as string);
    (this.wildMiniplayerX = this.nextMiniplayerX), (this.wildMiniplayerY = this.nextMiniplayerY);
    document.addEventListener("mousemove", this.handleDragging, { signal: this.signal });
    document.addEventListener("touchmove", this.handleDragging, { passive: false, signal: this.signal });
    for (const type of ["mouseup", "mouseleave", "touchend", "touchcancel"]) document.addEventListener(type, this.handleDragEnd, { signal: this.signal });
    this.media.container.style.setProperty("transition", "none", "important");
  }

  protected handleDragging(e: globalThis.Event): void {
    if ((e as TouchEvent).touches?.length > 1) return;
    e.preventDefault();
    this.ctlr.plug("settings.overlay")?.hide("force");
    this.media.container.classList.add("tmg-media-player-dragging");
    this.ctlr.RAFLoop("miniplayerDragging", () => {
      const x = (e as MouseEvent).clientX ?? (e as TouchEvent).changedTouches?.[0]?.clientX ?? 0,
        y = (e as MouseEvent).clientY ?? (e as TouchEvent).changedTouches?.[0]?.clientY ?? 0;
      if (this.prevEX === x && this.prevEY === y) return; // #CONSERVATION: peak stays peak
      (this.prevEX = x), (this.prevEY = y);
      const { innerWidth: ww, innerHeight: wh } = window,
        { offsetWidth: w, offsetHeight: h } = this.media.container,
        newX = this.lastMiniplayerPosX + (x - this.lastMiniplayerPtrX),
        newY = this.lastMiniplayerPosY - (y - this.lastMiniplayerPtrY),
        posX = clamp(w / 2, newX, ww - w / 2),
        posY = clamp(h / 2, newY, wh - h / 2);
      this.media.container.style.setProperty("transform", `translate(${x - this.lastMiniplayerPtrX}px, ${y - this.lastMiniplayerPtrY}px)`, "important");
      (this.nextMiniplayerX = `${(posX / ww) * 100}%`), (this.nextMiniplayerY = `${(posY / wh) * 100}%`);
      (this.wildMiniplayerX = `${(newX / ww) * 100}%`), (this.wildMiniplayerY = `${(newY / wh) * 100}%`);
    });
  }
  private prevEX?: number;
  private prevEY?: number;

  protected handleDragEnd(): void {
    this.ctlr.cancelRAFLoop("miniplayerDragging");
    this.media.container.classList.remove("tmg-media-player-dragging");
    this.media.container.style.setProperty("left", this.wildMiniplayerX, "important");
    this.media.container.style.setProperty("bottom", this.wildMiniplayerY, "important");
    this.media.container.style.removeProperty("transform");
    setTimeout(() => ((this.settings.css.currentMiniplayerX = this.nextMiniplayerX), (this.settings.css.currentMiniplayerY = this.nextMiniplayerY), ["transition", "left", "bottom"].forEach((prop) => this.media.container.style.removeProperty(prop))), 0, this.signal);
    document.removeEventListener("mousemove", this.handleDragging);
    document.removeEventListener("touchmove", this.handleDragging);
    for (const type of ["mouseup", "mouseleave", "touchend", "touchcancel"]) document.removeEventListener(type, this.handleDragEnd);
  }

  public syncFeatures(): void {
    if (this.config.disabled) return void (this.media.features.miniplayer = false);
    this.media.features.miniplayer ||= this.ctlr.isNativeEl;
  }

  protected override onDestroy(): void {
    document.removeEventListener("mousemove", this.handleDragging);
    document.removeEventListener("touchmove", this.handleDragging);
    for (const type of ["mouseup", "mouseleave", "touchend", "touchcancel"]) document.removeEventListener(type, this.handleDragEnd);
    for (const type of ["mousedown", "touchstart"]) this.media.container.removeEventListener(type, this.handleDragStart);
    super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.miniplayer": typeof ModesMiniplayerPin;
  }
}
