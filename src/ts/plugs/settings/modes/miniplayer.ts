import { BasePin } from "../../base";
import { MODES_MINIPLAYER_BUILD, RESIZE_DIRS } from "./build";
import type { ModesMiniplayerConfig, ResizeDir } from "./types";
import { ModesPlug } from "./index";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import { inDocView, getWindow, createEl, getClientWH } from "@utils/dom";
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

  public override wire(): void {
    // this.settings.css.currentMiniplayerX, this.settings.css.currentMiniplayerY, this.settings.css.currentMiniplayerWidth, this.settings.css.currentMiniplayerHeight; // Read once so CSSPlug can cache computed values.
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- State --------
    this.ctlr.state.on("dimensions.window.width", () => !this.ctlr.isUIActive("fullscreen") && this.toggle(), { signal: this.signal });
    this.ctlr.state.watch("dimensions.container.width", (w, { target: { object } }) => this.handleResize(w, object.height), { signal: this.signal });
    this.ctlr.state.watch("dimensions.container.height", (h, { target: { object } }) => this.handleResize(object.width, h), { signal: this.signal });
    // ---- Media Listeners
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
    e.value ? !active && this.enter() : active && this.exit();
    e.resolve(this.name); // btw this is a smart behavioral implementation rather than just a toggler
  }

  protected enter(): void {
    this.ctlr.plug("skeleton")?.enterPseudoMode();
    this.media.container.classList.add("tmg-media-miniplayer", "tmg-media-progress-bar"), this.media.pseudoContainer.classList.add("tmg-media-in-miniplayer");
    for (const type of ["mousedown", "touchstart"]) this.media.container.addEventListener(type, this.handleDragStart, { signal: this.signal });
    this.injectResizers();
    this.media.state.miniplayer = true;
  } // #STANDALONE: partner courtesy

  protected exit(behavior?: ScrollBehavior): void {
    if (behavior && inDocView(this.media.pseudoContainer)) this.media.pseudoContainer.scrollIntoView({ behavior, block: "center", inline: "center" });
    this.ctlr.plug("skeleton")?.leavePseudoMode();
    this.media.container.classList.remove("tmg-media-miniplayer"), this.media.pseudoContainer.classList.remove("tmg-media-in-miniplayer");
    this.media.container.classList.toggle("tmg-media-progress-bar", this.settings.controlPanel.progressBar);
    for (const type of ["mousedown", "touchstart"]) this.media.container.removeEventListener(type, this.handleDragStart);
    this.ejectResizers();
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

  // ---- Drag (move) ----
  protected lastMiniplayerPosX = 0;
  protected lastMiniplayerPosY = 0;
  protected lastMiniplayerPtrX = 0;
  protected lastMiniplayerPtrY = 0;
  protected nextMiniplayerX = "";
  protected nextMiniplayerY = "";
  protected wildMiniplayerX = "";
  protected wildMiniplayerY = "";

  protected handleDragStart(e: globalThis.Event): void {
    const target = e.target as HTMLElement,
      clientX = (e as MouseEvent).clientX ?? (e as TouchEvent).targetTouches?.[0]?.clientX ?? 0,
      clientY = (e as MouseEvent).clientY ?? (e as TouchEvent).targetTouches?.[0]?.clientY ?? 0; // console.log(target.scrollWidth, target.clientWidth, target.scrollWidth >= target.clientWidth + 3);
    if (!this.ctlr.isUIActive("miniplayer") || target.scrollWidth >= target.clientWidth + 3 || [this.ctlr.DOM.topControlsWrapper, this.ctlr.DOM.bottomControlsWrapper, this.ctlr.DOM.captionsContainer].some((w) => w?.contains(target)) || target.closest(`:is(${INTERACTIVE_SELECTOR},.tmg-media-miniplayer-resize-handle,[class$='toast-container'])`)) return;
    const { left, top } = getComputedStyle(this.media.container);
    (this.lastMiniplayerPosX = parseFloat(left)), (this.lastMiniplayerPosY = parseFloat(top)), (this.lastMiniplayerPtrX = clientX), (this.lastMiniplayerPtrY = clientY);
    (this.nextMiniplayerX = this.settings.css.currentMiniplayerX as string), (this.nextMiniplayerY = this.settings.css.currentMiniplayerY as string), (this.wildMiniplayerX = this.nextMiniplayerX), (this.wildMiniplayerY = this.nextMiniplayerY);
    document.addEventListener("mousemove", this.handleDragging, { signal: this.signal }), document.addEventListener("touchmove", this.handleDragging, { passive: false, signal: this.signal });
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
      const { clientWidth: ww, clientHeight: wh } = getClientWH(this.media.container.parentElement),
        { width: w, height: h } = this.ctlr.state.dimensions.container,
        newX = this.lastMiniplayerPosX + (x - this.lastMiniplayerPtrX),
        newY = this.lastMiniplayerPosY + (y - this.lastMiniplayerPtrY),
        posX = clamp(w / 2, newX, ww - w / 2),
        posY = clamp(h / 2, newY, wh - h / 2);
      this.media.container.style.setProperty("transform", `translate(${x - this.lastMiniplayerPtrX}px, ${y - this.lastMiniplayerPtrY}px)`, "important");
      (this.nextMiniplayerX = `${(posX / ww) * 100}%`), (this.nextMiniplayerY = `${(posY / wh) * 100}%`), (this.wildMiniplayerX = `${(newX / ww) * 100}%`), (this.wildMiniplayerY = `${(newY / wh) * 100}%`);
    });
  }
  private prevEX?: number;
  private prevEY?: number;

  protected handleDragEnd(): void {
    this.ctlr.cancelRAFLoop("miniplayerDragging");
    this.media.container.classList.remove("tmg-media-player-dragging");
    this.media.container.style.setProperty("left", this.wildMiniplayerX, "important"), this.media.container.style.setProperty("top", this.wildMiniplayerY, "important"), this.media.container.style.removeProperty("transform");
    setTimeout(() => ((this.settings.css.currentMiniplayerX = this.nextMiniplayerX), (this.settings.css.currentMiniplayerY = this.nextMiniplayerY), ["transition", "left", "top"].forEach((prop) => this.media.container.style.removeProperty(prop))), 0, this.signal);
    document.removeEventListener("mousemove", this.handleDragging), document.removeEventListener("touchmove", this.handleDragging);
    for (const type of ["mouseup", "mouseleave", "touchend", "touchcancel"]) document.removeEventListener(type, this.handleDragEnd);
  }

  // ---- Resize ----
  protected resizers: HTMLElement[] | null = null;
  protected resizeDir: ResizeDir | null = null;
  protected resizeStartX = 0;
  protected resizeStartY = 0;
  protected resizeStartW = 0;
  protected resizeStartH = 0;
  protected resizeStartLeft = 0;
  protected resizeStartTop = 0;

  protected handleResizeStart(e: PointerEvent, dir: ResizeDir): void {
    e.stopPropagation(), e.preventDefault();
    const { left, top } = getComputedStyle(this.media.container),
      rect = this.media.container.getBoundingClientRect();
    (this.resizeDir = dir), (this.resizeStartX = e.clientX), (this.resizeStartY = e.clientY), (this.resizeStartW = rect.width), (this.resizeStartH = rect.height), (this.resizeStartLeft = parseFloat(left)), (this.resizeStartTop = parseFloat(top));
    document.addEventListener("pointermove", this.handleResizing, { signal: this.signal });
    document.addEventListener("pointerup", this.handleResizeEnd, { signal: this.signal });
  }

  protected handleResizing(e: PointerEvent): void {
    if (!this.resizeDir) return;
    e.preventDefault();
    this.ctlr.RAFLoop("miniplayerResizing", () => {
      const dx = e.clientX - this.resizeStartX,
        dy = e.clientY - this.resizeStartY,
        { clientWidth: ww, clientHeight: wh } = (this.prevWH = getClientWH(this.media.container.parentElement));
      (this.settings.css.currentMiniplayerWidth = `${clamp(160, this.resizeStartW + (this.resizeDir!.includes("e") ? dx : this.resizeDir!.includes("w") ? -dx : 0), Math.min(600, ww))}px`), (this.settings.css.currentMiniplayerHeight = `${clamp(90, this.resizeStartH + (this.resizeDir!.includes("s") ? dy : this.resizeDir!.includes("n") ? -dy : 0), Math.min(400, wh))}px`);
    });
  }
  protected handleResize(actualW: number, actualH: number): void {
    if (!this.resizeDir || !actualW || !actualH) return;
    const { clientWidth: ww, clientHeight: wh } = (this.prevWH ??= getClientWH(this.media.container.parentElement));
    (this.settings.css.currentMiniplayerX = `${((this.resizeStartLeft + (this.resizeDir.includes("w") ? this.resizeStartW - actualW : this.resizeDir.includes("e") ? actualW - this.resizeStartW : 0) / 2) / ww) * 100}%`), (this.settings.css.currentMiniplayerY = `${((this.resizeStartTop + (this.resizeDir.includes("n") ? this.resizeStartH - actualH : this.resizeDir.includes("s") ? actualH - this.resizeStartH : 0) / 2) / wh) * 100}%`);
  }
  private prevWH?: { clientWidth: number; clientHeight: number } | null;

  protected handleResizeEnd(): void {
    this.ctlr.cancelRAFLoop("miniplayerResizing");
    this.resizeDir = this.prevWH = null;
    document.removeEventListener("pointermove", this.handleResizing);
    document.removeEventListener("pointerup", this.handleResizeEnd);
  }

  protected injectResizers(): void {
    this.resizers = RESIZE_DIRS.map((dir) => {
      const el = createEl("div", { className: `tmg-media-miniplayer-resize-handle tmg-media-miniplayer-resize-${dir}`, ariaHidden: "true" });
      el.addEventListener("pointerdown", (e) => this.handleResizeStart(e, dir), { signal: this.signal });
      el.addEventListener("dblclick", (e, sache = this.ctlr.plug("settings.css")?._cache) => (e.stopImmediatePropagation(), sache && ((this.settings.css.currentMiniplayerWidth = sache.currentMiniplayerWidth!), (this.settings.css.currentMiniplayerHeight = sache.currentMiniplayerHeight!))), { signal: this.signal });
      return this.media.container.append(el), el;
    });
  }
  protected ejectResizers(): void {
    if (this.resizers) for (const el of this.resizers) el.remove();
    this.resizers = null;
  }

  public syncFeatures(): void {
    if (this.config.disabled) return void (this.media.features.miniplayer = false);
    this.media.features.miniplayer ||= this.ctlr.isNativeEl;
  }

  protected override onDestroy(): void {
    this.ejectResizers(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.miniplayer": typeof ModesMiniplayerPin;
  }
}
