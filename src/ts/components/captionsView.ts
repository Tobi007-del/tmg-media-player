import { BaseComponent, ComponentState } from "./base";
import { type CueLike, STYLE_PATHS } from "@plugs/settings/captions";
import { capitalize } from "@utils/str";
import { clamp, parseIfPercent, safeNum } from "@utils/num";
import { createEl } from "@utils/dom";
import { formatVttLine, parseVttText } from "@utils/text";
import { isDef, isObj } from "@utils/obj";
import { setTimeout, requestAnimationFrame } from "@utils/fn";
import { startTx, endTx, Transaction, transaction } from "sia-reactor/modules";
import { getTrackNum } from "@utils/media";

export interface CaptionsViewConfig {
  isMain?: boolean;
  isSolo?: boolean;
  ofMedia?: boolean;
  secOrder?: number;
  language?: string;
  trackIdx?: number;
  initialX?: string;
  initialY?: string;
}

export class CaptionsView extends BaseComponent<CaptionsViewConfig, ComponentState, HTMLDivElement> {
  public static readonly componentName: string = "captionsView";
  protected cues: CueLike[] | null = null;
  protected charW = 0;
  protected lineHPx = 0;
  protected fontSize = 0;
  protected lastPosX = 0;
  protected lastPosY = 0;
  protected lastPtrX = 0;
  protected lastPtrY = 0;
  protected timeNodes: timeNode[] | null = null;
  protected timeoutId = -1;

  public override create(): HTMLDivElement {
    return (this.element = createEl("div", { className: "tmg-media-captions-container" }, { part: "region", isMain: String(!!this.config.isMain), isSolo: String(!!this.config.isSolo) }));
  }

  public override mount(): void {
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.el);
    if (this.config.isMain) this.ctlr.DOM.captionsContainer ||= this.el;
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("pointerdown", this.handleDragStart, { signal: this.signal });
    // Ctlr State Listeners
    this.ctlr.state.on("dimensions.container.width", this.rerender, { init: true, signal: this.signal });
    // ---- Media ---------
    this.media.on("state.objectFit", this.rerender, { signal: this.signal });
    this.config.isMain && this.media.on("state.secondaryTextTracks", this.syncBadge, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.captions.window.position.lockToVideo", this.rerender, { signal: this.signal });
    for (const p of STYLE_PATHS) !/color|opacity/.test(p) && this.ctlr.config.on(`settings.captions.${p}`, () => this.rerender(true), { signal: this.signal });
  }

  public syncSize(force = false): void {
    const w = this.ctlr.state.dimensions.container.width;
    if (!force && this.lastSyncW === w) return;
    (this.lastSyncW = w), this.el.style.setProperty("display", "block", "important");
    const measurer = this.el.appendChild(createEl("span", { className: "tmg-media-captions-text", innerHTML: "abcdefghijklmnopqrstuvwxyz".repeat(2) }, {}, { visibility: "hidden" })),
      { lineHeight, fontSize } = getComputedStyle(measurer);
    (this.charW = measurer.offsetWidth / 52), (this.fontSize = safeNum(parseFloat(fontSize), 16)), (this.lineHPx = !safeNum(parseFloat(lineHeight), 0) ? this.fontSize * 1.2 : parseFloat(lineHeight));
    measurer.remove(), this.el.style.removeProperty("display");
  }
  private lastSyncW = 0;

  public preview(cue: CueLike | string = `${capitalize(this.media.status.textKind || "captions")} look like this`, flush = this.previewing): void {
    const should = flush || !this.ctlr.isUIActive("captions") || !this.el.textContent;
    this.render(should ? [isObj(cue) ? cue : { text: cue }] : this.cues, should), should && clearTimeout(this.timeoutId);
    if (should) this.timeoutId = setTimeout(() => (this.previewing && ((this.el.innerHTML = ""), (this.cues = null)), this.el.classList.remove("tmg-media-captions-preview")), this.settings.captions.previewTimeout, this.signal);
  }
  public get previewing(): boolean {
    return this.el.classList.contains("tmg-media-captions-preview");
  }

  public rerender(force?: unknown): void {
    if (this.media.state.textVisible || this.previewing || this.config.isSolo) this.syncSize(force === true), this.cues && this.render(this.cues, this.previewing, true);
  }
  public render(cues: CueLike[] | null, isPreview = false, transition = false): void {
    this.el.classList.toggle("tmg-media-captions-preview", isPreview), !isPreview && clearTimeout(this.timeoutId);
    const existing = this.el.querySelector<HTMLElement>(".tmg-media-captions-wrapper");
    if (!(this.cues = cues)?.length) return existing?.remove();
    this.syncSize(), this.el.removeAttribute("data-active"), this.el.removeAttribute("data-scroll"), this.el.removeAttribute("style");
    const cue = cues![0],
      cueSize = cue?.region?.width ?? (this.canOverride ? cue?.size : undefined),
      { width: vCWidth, height: vCHeight } = this.ctlr.state.dimensions.container,
      wrapWidth = (this.settings.captions.window.position.lockToVideo ? this.ctlr.state.dimensions.object.width || vCWidth : vCWidth) * (cueSize && cueSize !== 100 ? cueSize / 100 : 1) - this.fontSize * 2, // Padding allowance
      wrapper = existing ?? this.el.appendChild(createEl("div", { className: "tmg-media-captions-wrapper", ariaLive: "Off", ariaAtomic: "true" }, { part: "cue-display" }));
    if (!this.config.isMain) this.dragX && this.el.style.setProperty(`${sPfx}x`, this.dragX), this.dragY && this.el.style.setProperty(`${sPfx}y`, this.dragY);
    (wrapper.innerHTML = ""), this.syncBadge();
    for (const cue of cues!) {
      (cue.text ||= ""), (cue.align = cue.align === "left" ? "start" : cue.align === "right" ? "end" : cue.align);
      for (const l of formatVttLine(cue.text.replace(/\\N/gi, "\n"), Math.floor(wrapWidth / this.charW))) wrapper.append(createEl("div", { className: "tmg-media-captions-line" }, cue.id ? { part: "cue", id: cue.id } : { part: "cue" }, cue.align && cue.align !== "center" && this.canOverride ? { textAlign: cue.align } : undefined)!.appendChild(createEl("span", { className: "tmg-media-captions-text", innerHTML: parseVttText(l) })!).parentElement!);
    }
    if (!transition) this.el.style.setProperty("transition", "none", "important"), requestAnimationFrame(() => this.el.style.removeProperty("transition"), this.signal);
    const { offsetWidth: cWidth, offsetHeight: cHeight } = this.el;
    this.config.isMain ? ((this.settings.css.currentCaptionsContainerHeight = `${cHeight}px`), (this.settings.css.currentCaptionsContainerWidth = `${cWidth}px`)) : (this.el.style.setProperty("--cmptd-cue-box-height", `${cHeight}px`), this.el.style.setProperty("--cmptd-cue-box-width", `${cWidth}px`));
    const regionCue = cues!.find((c) => c.region);
    if (regionCue?.region) {
      this.el.setAttribute("data-active", "");
      const { width, lines: rLines, viewportAnchorX: vpAnX, viewportAnchorY: vpAnY, scroll } = regionCue.region;
      if (isDef(vpAnX)) this.el.style.setProperty(`${sPfx}x`, `${vpAnX}%`);
      if (isDef(vpAnY)) this.el.style.setProperty(`${sPfx}y`, `${vpAnY}%`);
      if (isDef(width)) this.el.style[regionCue.fluid ? "maxWidth" : "width"] = `${width}%`;
      if (isDef(rLines)) this.el.style[regionCue.fluid ? "maxHeight" : "height"] = `${Number(rLines) * ((this.lineHPx / vCHeight) * 100)}%`;
      if (scroll === "up") (this.el.dataset.scroll = scroll), this.ctlr.config.stall(() => (this.el.scrollTop = wrapper.scrollHeight));
    } else if (this.canOverride) {
      if (isDef(cue.position) && cue.position !== "auto") {
        const elHalfWPct = ((cWidth / vCWidth) * 100) / 2,
          posOffset = cue.positionAlign === "line-left" ? 0 : cue.positionAlign === "line-right" ? -2 * elHalfWPct : -elHalfWPct;
        this.el.style.setProperty(`${sPfx}x`, `calc(${cue.position}% + ${posOffset}% + ${elHalfWPct}%)`);
      }
      if (isDef(cue.line) && cue.line !== "auto") {
        const line = parseIfPercent(cue.line, 100),
          lhPct = (this.lineHPx / vCHeight) * 100,
          elHalfHPct = ((cHeight / vCHeight) * 100) / 2,
          lAlign = cue.lineAlign && cue.lineAlign !== "auto" ? cue.lineAlign : line < 0 ? "end" : "start",
          lineOffset = lAlign === "start" ? 0 : lAlign === "end" ? -2 * elHalfHPct : -elHalfHPct,
          topVal = cue.snapToLines ? (line < 0 ? 100 - (Math.abs(line) - 1) * lhPct : line * lhPct) : line;
        this.el.style.setProperty(`${sPfx}y`, `calc(${topVal}% + ${lineOffset}% + ${elHalfHPct}%)`);
      }
      if (cueSize && cueSize !== 100) this.el.style[cue.fluid ? "maxWidth" : "width"] = `${cueSize}%`;
      if (cue.vertical) this.el.style.writingMode = cue.vertical === "lr" ? "vertical-lr" : "vertical-rl";
      if (cue.scroll === "up") (this.el.dataset.scroll = cue.scroll), this.ctlr.config.stall(() => (this.el.scrollTop = wrapper.scrollHeight));
    }
    this.timeNodes = Array.from(wrapper.querySelectorAll<HTMLElement>("[data-part='timed']"), (el, _, [, m, s, ms] = (el.dataset.time || "").match(/(\d+):(\d+)\.(\d+)/) || []) => ({ el, time: m ? +m * 60 + +s + +ms / 1000 : 0 }));
    this.syncKaraoke();
  }
  protected dragX = this.config.initialX;
  protected dragY = this.config.secOrder ? this.orderDragY : this.config.initialY;

  public syncBadge(): void {
    this.settings.captions.multiple && this.media.state.secondaryTextTracks.length && (this.config.language || this.config.isMain) ? this.el.firstElementChild?.setAttribute("data-badge", `${this.config.language?.toUpperCase() || "M"}${getTrackNum(this.media.status.textTracks, this.config.isMain ? this.media.state.currentTextTrack : this.config.trackIdx!)}`) : this.el.firstElementChild?.removeAttribute("data-badge");
  }
  public syncKaraoke(): void {
    if (this.timeNodes) for (const { el, time } of this.timeNodes) el.toggleAttribute("data-past", safeNum(this.media.state.currentTime) > time), el.toggleAttribute("data-future", !el.hasAttribute("data-past"));
  }

  protected handleDragStart(e: PointerEvent): void {
    this.el.setPointerCapture(e.pointerId), this.useTx(true);
    const { left, top } = getComputedStyle(this.el);
    (this.lastPosX = parseFloat(left)), (this.lastPosY = parseFloat(top));
    (this.lastPtrX = e.clientX), (this.lastPtrY = e.clientY);
    for (const evt of ["pointermove", "pointerup", "pointercancel"] as const) this.el.addEventListener(evt, evt === "pointermove" ? this.handleDragging : this.handleDragEnd, { signal: this.signal });
  }

  protected handleDragging(e: PointerEvent): void {
    this.media.container.classList.add("tmg-media-captions-dragging");
    this.ctlr.RAFLoop("captionsDragging", () => {
      if (e.clientX === this.prevEX && e.clientY === this.prevEY) return; // #CONSERVATION: peak stays peak
      (this.prevEX = e.clientX), (this.prevEY = e.clientY);
      const { width: ww, height: hh } = this.ctlr.state.dimensions.container,
        { offsetWidth: w, offsetHeight: h } = this.el,
        posX = clamp(w / 2, this.lastPosX + (e.clientX - this.lastPtrX), ww - w / 2),
        posY = clamp(h / 2, this.lastPosY + (e.clientY - this.lastPtrY), hh - h / 2);
      if (this.config.isMain) (this.settings.css.currentCaptionsX = `${(posX / ww) * 100}%`), (this.settings.css.currentCaptionsY = `${(posY / hh) * 100}%`);
      else this.el.style.setProperty(`${sPfx}x`, (this.dragX = `${(posX / ww) * 100}%`)), this.el.style.setProperty(`${sPfx}y`, (this.dragY = `${(posY / hh) * 100}%`));
    });
  }
  private prevEX?: number;
  private prevEY?: number;

  protected handleDragEnd(): void {
    this.ctlr.cancelRAFLoop("captionsDragging"), this.useTx(), this.media.container.classList.remove("tmg-media-captions-dragging");
    for (const evt of ["pointermove", "pointerup", "pointercancel"] as const) this.el.removeEventListener(evt, evt === "pointermove" ? this.handleDragging : this.handleDragEnd);
  }

  public resetPos(): void {
    if (this.config.isMain) {
      const sache = this.ctlr.plug("settings.css")?.build;
      sache && transaction(() => ((this.settings.css.currentCaptionsX = sache.currentCaptionsX!), (this.settings.css.currentCaptionsY = sache.currentCaptionsY!)), "Captions position reset");
    } else {
      if (this.dragX === this.el.style.getPropertyValue(`${sPfx}x`)) (this.dragX = this.config.initialX), isDef(this.dragX) ? this.el.style.setProperty(`${sPfx}x`, this.dragX!) : this.el.style.removeProperty(`${sPfx}x`);
      if (this.dragY === this.el.style.getPropertyValue(`${sPfx}y`)) (this.dragY = this.orderDragY ?? this.config.initialY), isDef(this.dragY) ? this.el.style.setProperty(`${sPfx}y`, this.dragY!) : this.el.style.removeProperty(`${sPfx}y`);
    }
    this.canOverride && this.rerender();
  }
  public get orderDragY() {
    return this.config.secOrder ? `calc(100% - ((var(--tmg-media-current-captions-container-height) * ${this.config.secOrder}) + (var(--tmg-media-current-captions-container-height) / 2) + (var(--tmg-media-current-unit) / 2)))` : undefined; // Offset secondary track over main to avoid overlap; CSS clamps
  }
  public get canOverride(): boolean {
    return this.settings.captions.allowMediaOverride || (!this.config.isMain && !this.config.ofMedia);
  }

  protected tx: Transaction | null = null;
  protected useTx(bool = false): void {
    this.config.isMain && (bool ? (this.tx = startTx("Captions drag")) : this.tx && this.ctlr.config.stall(() => (endTx(this.tx!), (this.tx = null))));
  }

  protected override onDestroy(): void {
    if (this.config.isMain) this.settings.css.currentCaptionsContainerHeight = this.settings.css.currentCaptionsContainerWidth = "0px";
    if (this.ctlr.DOM.captionsContainer === this.el) this.ctlr.DOM.captionsContainer = null;
    super.onDestroy();
  }
}
const sPfx = "--tmg-media-current-captions-";

type timeNode = {
  el: HTMLElement;
  time: number;
};

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    captionsView: typeof CaptionsView;
  }
}
