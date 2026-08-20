import { BaseComponent, ComponentState } from "./base";
import type { CueLike } from "@plugs/settings/captions";
import { capitalize } from "@utils/str";
import { clamp, parseIfPercent, safeNum } from "@utils/num";
import { createEl } from "@utils/dom";
import { formatVttLine, parseVttText } from "@utils/media";
import { isDef, isObj, isStr } from "@utils/obj";
import { setTimeout, requestAnimationFrame } from "@utils/fn";

export type CaptionsViewConfig = {
  secondaryOrder?: number;
  isMain?: boolean;
};

export class CaptionsView extends BaseComponent<CaptionsViewConfig, ComponentState, HTMLDivElement> {
  public static readonly componentName: string = "captionsView";
  protected prevCues: CueLike[] | null = null;
  protected karaokeNodes: KaraokeNode[] | null = null;
  protected lastPreview = "";
  protected timeoutId = -1;
  protected charW = 0;
  protected lineHPx = 0;
  protected fontSize = 0;
  protected lastPosX = 0;
  protected lastPosY = 0;
  protected lastPtrX = 0;
  protected lastPtrY = 0;

  public override create(): HTMLDivElement {
    return (this.element = createEl("div", { className: "tmg-media-captions-container" }, { part: "region", isMain: String(!!this.config.isMain) }));
  }

  public override mount(): void {
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.el);
    if (this.config.isMain) this.ctlr.DOM.captionsContainer ||= this.el;
  }

  public override wire(): void {
    //Variables Assignment
    if (this.config.secondaryOrder) this.dragY = `calc(100% - ((var(--tmg-media-current-captions-container-height) * ${this.config.secondaryOrder}) + (var(--tmg-media-current-captions-container-height) / 2) + (var(--tmg-media-current-unit) / 2)))`; // Offset secondary track over main to avoid overlap; CSS clamps
    // Event Listeners
    this.el.addEventListener("pointerdown", this.handleDragStart, { signal: this.signal });
    // Ctlr State Listeners
    this.ctlr.state.on("dimensions.container.width", this.syncSize, { init: true, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.captions.window.position.lockToVideo", this.syncSize, { signal: this.signal });
    // ---- Media ---------
    this.media.on("state.objectFit", this.syncSize, { signal: this.signal });
  }

  public syncSize(): void {
    this.el.style.setProperty("display", "block", "important");
    const measurer = createEl("span", { className: "tmg-media-captions-text", innerHTML: "abcdefghijklmnopqrstuvwxyz".repeat(2) }, {}, { visibility: "hidden" });
    this.el.append(measurer);
    this.charW = measurer.offsetWidth / 52;
    const { lineHeight, fontSize } = getComputedStyle(measurer);
    (this.fontSize = safeNum(parseFloat(fontSize), 16)), (this.lineHPx = !safeNum(parseFloat(lineHeight), 0) ? this.fontSize * 1.2 : parseFloat(lineHeight));
    measurer.remove(), this.el.style.removeProperty("display"), this.preview("");
  }

  public preview(cue: CueLike | string = `${capitalize(this.media.status.trackKind || "captions")} look like this`, flush = this.isPreviewing()): void {
    const text = isStr(cue) ? cue : cue.text || "",
      should = flush || !this.ctlr.isUIActive("captions") || !this.el.textContent;
    should && this.media.container.classList.add("tmg-media-captions-preview");
    this.render(should ? [isObj(cue) ? cue : { text: cue }] : this.prevCues);
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout((flush = this.isPreviewing(text)) => (this.media.container.classList.remove("tmg-media-captions-preview"), flush && (this.el.innerHTML = "")), this.settings.captions.previewTimeout, this.signal);
    this.lastPreview = text;
  }
  public isPreviewing(text = this.lastPreview): boolean {
    return !!this.el.innerHTML && this.el.textContent.replace(/\s/g, "") === text?.replace(/\s/g, "");
  }

  public render(cues: CueLike[] | null): void {
    const existing = this.el.querySelector<HTMLElement>(".tmg-media-captions-wrapper");
    if (!cues?.length) return existing?.remove();
    for (const attr of ["style", "data-active", "data-scroll"]) this.el.removeAttribute(attr);
    const wrapper = existing ?? createEl("div", { className: "tmg-media-captions-wrapper", ariaLive: "Off", ariaAtomic: "true" }, { part: "cue-display" }),
      { width: vCWidth, height: vCHeight } = this.ctlr.state.dimensions.container,
      allowOverride = this.settings.captions.allowMediaOverride || !this.config.isMain,
      wrapWidth = (this.settings.captions.window.position.lockToVideo ? this.ctlr.state.dimensions.object.width || vCWidth : vCWidth) - this.fontSize * 2; // Padding allowance
    if (!this.config.isMain) this.dragX && this.el.style.setProperty("--tmg-media-current-captions-x", this.dragX), this.dragY && this.el.style.setProperty("--tmg-media-current-captions-y", this.dragY);
    (wrapper.innerHTML = ""), (this.prevCues = cues);
    for (const cue of cues) {
      (cue.text ||= ""), (cue.align = cue.align === "left" ? "start" : cue.align === "right" ? "end" : cue.align);
      const lines = cue.text.replace(/(<br\s*\/>)|\\N/gi, "\n").split(/\n/);
      for (const p of lines) for (const l of formatVttLine(p, Math.floor(wrapWidth / this.charW))) wrapper.append(createEl("div", { className: "tmg-media-captions-line" }, cue.id ? { part: "cue", id: cue.id } : { part: "cue" }, allowOverride && cue.align && cue.align !== "center" ? { textAlign: cue.align } : undefined)!.appendChild(createEl("span", { className: "tmg-media-captions-text", innerHTML: parseVttText(l) })!).parentElement!);
    }
    !existing && this.el.append(wrapper), this.el.style.setProperty("transition", "none", "important"), requestAnimationFrame(() => this.el.style.removeProperty("transition"), this.signal);
    const { offsetWidth: cWidth, offsetHeight: cHeight } = this.el;
    this.config.isMain ? (this.settings.css.currentCaptionsContainerHeight = `${cHeight}px`) : this.el.style.setProperty("--cmptd-cue-box-height", `${cHeight}px`);
    this.config.isMain ? (this.settings.css.currentCaptionsContainerWidth = `${cWidth}px`) : this.el.style.setProperty("--cmptd-cue-box-width", `${cWidth}px`);
    const regionCue = cues.find((c) => c.region);
    if (regionCue?.region) {
      this.el.setAttribute("data-active", "");
      const { width, lines: rines, viewportAnchorX: vpAnX, viewportAnchorY: vpAnY, scroll } = regionCue.region;
      if (isDef(vpAnX)) this.el.style.setProperty("--tmg-media-current-captions-x", `${vpAnX}%`);
      if (isDef(vpAnY)) this.el.style.setProperty("--tmg-media-current-captions-y", `${vpAnY}%`);
      if (isDef(width)) this.el.style.width = `${width}%`;
      if (isDef(rines)) this.el.style.height = `${Number(rines) * ((this.lineHPx / vCHeight) * 100)}%`;
      if (scroll === "up") (this.el.dataset.scroll = scroll), this.ctlr.config.stall(() => (this.el.scrollTop = wrapper.scrollHeight));
    } else if (allowOverride) {
      const cue = cues[0];
      if (isDef(cue.position) && cue.position !== "auto") {
        const elHalfWPct = ((cWidth / vCWidth) * 100) / 2,
          posOffset = cue.positionAlign === "line-left" ? 0 : cue.positionAlign === "line-right" ? -2 * elHalfWPct : -elHalfWPct;
        this.el.style.setProperty("--tmg-media-current-captions-x", `calc(${cue.position}% + ${posOffset}% + ${elHalfWPct}%)`);
      }
      if (isDef(cue.line) && cue.line !== "auto") {
        const line = parseIfPercent(cue.line, 100),
          lhPct = (this.lineHPx / vCHeight) * 100,
          elHalfHPct = ((cHeight / vCHeight) * 100) / 2,
          lAlign = cue.lineAlign && cue.lineAlign !== "auto" ? cue.lineAlign : line < 0 ? "end" : "start",
          lineOffset = lAlign === "start" ? 0 : lAlign === "end" ? -2 * elHalfHPct : -elHalfHPct,
          topVal = cue.snapToLines ? (line < 0 ? 100 - (Math.abs(line) - 1) * lhPct : line * lhPct) : line;
        this.el.style.setProperty("--tmg-media-current-captions-y", `calc(${topVal}% + ${lineOffset}% + ${elHalfHPct}%)`);
      }
      if (isDef(cue.size) && cue.size !== 100) this.el.style.width = `${cue.size}%`;
      if (cues[0].vertical) this.el.style.writingMode = cues[0].vertical === "lr" ? "vertical-lr" : "vertical-rl";
    }
    this.karaokeNodes = Array.from(wrapper.querySelectorAll<HTMLElement>("[data-part='timed']"), (el) => {
      const [, m, s, ms] = (el.dataset.time || "").match(/(\d+):(\d+)\.(\d+)/) || [];
      return { el, time: m ? +m * 60 + +s + +ms / 1000 : 0 };
    });
    this.syncKaraoke();
  }
  protected dragX?: string;
  protected dragY?: string;

  public syncKaraoke(): void {
    if (!this.karaokeNodes) return;
    for (const { el, time } of this.karaokeNodes) {
      const isPast = safeNum(this.media.state.currentTime) > time;
      el.toggleAttribute("data-past", isPast), el.toggleAttribute("data-future", !isPast);
    }
  }

  protected handleDragStart(e: PointerEvent): void {
    this.el.setPointerCapture(e.pointerId);
    const { left, top } = getComputedStyle(this.el);
    (this.lastPosX = parseFloat(left)), (this.lastPosY = parseFloat(top));
    (this.lastPtrX = e.clientX), (this.lastPtrY = e.clientY);
    this.el.addEventListener("pointermove", this.handleDragging, { signal: this.signal });
    this.el.addEventListener("pointerup", this.handleDragEnd, { signal: this.signal });
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
      else this.el.style.setProperty("--tmg-media-current-captions-x", (this.dragX = `${(posX / ww) * 100}%`)), this.el.style.setProperty("--tmg-media-current-captions-y", (this.dragY = `${(posY / hh) * 100}%`));
    });
  }
  private prevEX?: number;
  private prevEY?: number;

  protected handleDragEnd(): void {
    this.ctlr.cancelRAFLoop("captionsDragging");
    this.media.container.classList.remove("tmg-media-captions-dragging");
    this.el.removeEventListener("pointermove", this.handleDragging);
    this.el.removeEventListener("pointerup", this.handleDragEnd);
  }

  protected override onDestroy(): void {
    if (this.config.isMain) this.settings.css.currentCaptionsContainerHeight = this.settings.css.currentCaptionsContainerWidth = "0px";
    if (this.ctlr.DOM.captionsContainer === this.el) this.ctlr.DOM.captionsContainer = null;
    super.onDestroy();
  }
}

type KaraokeNode = {
  el: HTMLElement;
  time: number;
};

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    captionsView: typeof CaptionsView;
  }
}
