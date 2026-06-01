import { BasePin } from "../../base";
import { MODES_MINIPLAYER_BUILD } from "./build";
import type { ModesMiniplayer } from "./types";
import { ModesPlug } from "./index";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import { inDocView } from "@utils/dom";
import { setTimeout } from "@utils/fn";
import { clamp } from "@utils/num";
import { isInteractive } from "@t007/utils";

export class ModesMiniplayerPin extends BasePin<ModesPlug, ModesMiniplayer> {
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
    // Ctlr State Watchers
    this.ctlr.state.watch("dimensions.window.width", () => !this.ctlr.isUIActive("fullscreen") && this.toggle(), { signal: this.signal });
    // ---- Media  Listeners
    this.media.on("tech", () => !this.config.disabled && (this.media.features.miniplayer ||= true), { signal: this.signal });
    this.media.on("intent.miniplayer", this.handleMiniplayerIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.paused", ({ value }) => !value && this.toggle(), { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- State --------
    this.ctlr.state.on("mediaParentIntersecting", () => this.ctlr.payload.wired && this.toggle(), { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.modes.miniplayer.disabled", this.handleDisabled, { init: true, signal: this.signal });
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.modes.miniplayer.disabled">): void {
    this.media.features.miniplayer = !value;
    if (value && this.ctlr.isUIActive("miniplayer")) this.media.intent.miniplayer = false;
  }

  protected handleMiniplayerIntent(e: REvent<CtlrMedia, "intent.miniplayer">): void {
    if (e.resolved) return;
    const active = this.ctlr.isUIActive("miniplayer");
    if (this.config.disabled && !active) return e.resolve(this.name);
    e.value && !active ? this.enter() : active && this.exit();
    e.resolve(this.name); // btw this is a smart behavioral implementation rather than just a toggler
  }

  protected enter(): void {
    this.ctlr.plug("skeleton")?.activatePseudoMode();
    this.media.container.classList.add("tmg-media-miniplayer", "tmg-media-progress-bar");
    ["mousedown", "touchstart"].forEach((type) => this.media.container.addEventListener(type, this.handleDragStart, { signal: this.signal }));
    this.media.state.miniplayer = true;
  } // #STANDALONE: partner courtesy

  protected exit(behavior?: ScrollBehavior): void {
    if (behavior && inDocView(this.media.pseudoContainer)) this.media.pseudoContainer.scrollIntoView({ behavior, block: "center", inline: "center" });
    this.ctlr.plug("skeleton")?.deactivatePseudoMode();
    this.media.container.classList.remove("tmg-media-miniplayer");
    this.media.container.classList.toggle("tmg-media-progress-bar", this.ctlr.settings.controlPanel.progressBar);
    ["mousedown", "touchstart"].forEach((type) => this.media.container.removeEventListener(type, this.handleDragStart));
    this.media.state.miniplayer = false;
  } // #STANDALONE: needs scoped behavior
  public expand(): void {
    this.media.container.classList.contains("tmg-media-miniplayer") && this.exit("smooth");
  }
  public remove(): void {
    (this.media.intent.paused = true), this.exit();
  }
  public toggle(bool?: boolean): void {
    const active = this.ctlr.isUIActive("miniplayer"),
      modes = this.ctlr.plug("settings.modes");
    if ((bool === true && !active) || (!active && !this.ctlr.isUIActive("pictureInPicture") && !modes?.pictureInPicture?.inFloatingPlayer && !modes?.fullscreen?.inFullscreen && !this.ctlr.state.mediaParentIntersecting && window.innerWidth >= this.config.minWindowWidth && !this.media.state.paused)) this.media.intent.miniplayer = true;
    else if ((bool === false && active) || (active && this.ctlr.state.mediaParentIntersecting) || (active && window.innerWidth < this.config.minWindowWidth)) this.media.intent.miniplayer = false;
  }

  protected handleDragStart(e: globalThis.Event): void {
    const target = e.target as HTMLElement,
      clientX = (e as MouseEvent).clientX ?? (e as TouchEvent).targetTouches?.[0]?.clientX ?? 0,
      clientY = (e as MouseEvent).clientY ?? (e as TouchEvent).targetTouches?.[0]?.clientY ?? 0;
    if (!this.ctlr.isUIActive("miniplayer") || target.scrollWidth > target.clientWidth || isInteractive(target) || [this.ctlr.DOM.topControlsWrapper, this.ctlr.DOM.bottomControlsWrapper, this.ctlr.DOM.captionsContainer].some((w) => w?.contains(target)) || target.closest("[class$='toast-container']")) return;
    const { left, bottom } = getComputedStyle(this.media.container);
    (this.lastMiniplayerPosX = parseFloat(left)), (this.lastMiniplayerPosY = parseFloat(bottom));
    (this.lastMiniplayerPtrX = clientX), (this.lastMiniplayerPtrY = clientY);
    (this.nextMiniplayerX = this.ctlr.settings.css.currentMiniplayerX as string), (this.nextMiniplayerY = this.ctlr.settings.css.currentMiniplayerY as string);
    (this.wildMiniplayerX = this.nextMiniplayerX), (this.wildMiniplayerY = this.nextMiniplayerY);
    document.addEventListener("mousemove", this.handleDragging, { signal: this.signal });
    document.addEventListener("touchmove", this.handleDragging, { passive: false, signal: this.signal });
    ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((type) => document.addEventListener(type, this.handleDragEnd, { signal: this.signal }));
    this.media.container.style.setProperty("transition", "none", "important");
  }

  protected handleDragging(e: globalThis.Event): void {
    if ((e as TouchEvent).touches?.length > 1) return;
    e.preventDefault();
    this.ctlr.plug("settings.overlay")?.remove("force");
    this.media.container.classList.add("tmg-media-player-dragging");
    this.ctlr.RAFLoop("miniplayerDragging", () => {
      const { innerWidth: ww, innerHeight: wh } = window,
        { offsetWidth: w, offsetHeight: h } = this.media.container,
        x = (e as MouseEvent).clientX ?? (e as TouchEvent).changedTouches?.[0]?.clientX ?? 0,
        y = (e as MouseEvent).clientY ?? (e as TouchEvent).changedTouches?.[0]?.clientY ?? 0,
        newX = this.lastMiniplayerPosX + (x - this.lastMiniplayerPtrX),
        newY = this.lastMiniplayerPosY - (y - this.lastMiniplayerPtrY),
        posX = clamp(w / 2, newX, ww - w / 2),
        posY = clamp(h / 2, newY, wh - h / 2);
      this.media.container.style.setProperty("transform", `translate(${x - this.lastMiniplayerPtrX}px, ${y - this.lastMiniplayerPtrY}px)`, "important");
      (this.nextMiniplayerX = `${(posX / ww) * 100}%`), (this.nextMiniplayerY = `${(posY / wh) * 100}%`);
      (this.wildMiniplayerX = `${(newX / ww) * 100}%`), (this.wildMiniplayerY = `${(newY / wh) * 100}%`);
    });
  }

  protected handleDragEnd(): void {
    this.ctlr.cancelRAFLoop("miniplayerDragging");
    this.media.container.classList.remove("tmg-media-player-dragging");
    this.media.container.style.setProperty("left", this.wildMiniplayerX, "important");
    this.media.container.style.setProperty("bottom", this.wildMiniplayerY, "important");
    this.media.container.style.removeProperty("transform");
    setTimeout(() => ((this.ctlr.settings.css.currentMiniplayerX = this.nextMiniplayerX), (this.ctlr.settings.css.currentMiniplayerY = this.nextMiniplayerY), ["transition", "left", "bottom"].forEach((prop) => this.media.container.style.removeProperty(prop))), 0, this.signal);
    document.removeEventListener("mousemove", this.handleDragging);
    document.removeEventListener("touchmove", this.handleDragging);
    ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((type) => document.removeEventListener(type, this.handleDragEnd));
  }

  protected override onDestroy(): void {
    document.removeEventListener("mousemove", this.handleDragging);
    document.removeEventListener("touchmove", this.handleDragging);
    ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((type) => document.removeEventListener(type, this.handleDragEnd));
    ["mousedown", "touchstart"].forEach((type) => this.media.container.removeEventListener(type, this.handleDragStart));
    super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.miniplayer": typeof ModesMiniplayerPin;
  }
}
