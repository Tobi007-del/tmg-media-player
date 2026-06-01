import { BaseComponent, ComponentState } from "./base";
import type { CueLike } from "@plugs/settings/captions";
import { capitalize } from "@utils/str";
import { clamp, parseIfPercent, safeNum } from "@utils/num";
import { createEl } from "@utils/dom";
import { formatVttLine, parseVttText } from "@utils/media";
import { isDef, isObj, isStr } from "@utils/obj";
import { setTimeout } from "@utils/fn";

export type CaptionsViewConfig = undefined;
type KaraokeNode = { el: HTMLElement; time: number };

export class CaptionsView extends BaseComponent<CaptionsViewConfig, ComponentState, HTMLDivElement> {
  public static readonly componentName: string = "captionsview";
  protected isMain = false;
  protected prevCue: CueLike | null = null;
  protected karaokeNodes: KaraokeNode[] | null = null;
  protected lastPreview = "";
  protected previewTimeoutId = -1;
  protected charW = 0;
  protected lineHPx = 0;
  protected lastPosX = 0;
  protected lastPosY = 0;
  protected lastPtrX = 0;
  protected lastPtrY = 0;

  public override create(): HTMLDivElement {
    return (this.element = createEl("div", { className: "tmg-media-captions-container" }, { part: "region" }));
  }

  public override mount(): void {
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.element);
  }

  public override wire(): void {
    //Variables Assignment
    this.isMain = this.element === this.ctlr.DOM.captionsContainer;
    // Event Listeners
    this.el.addEventListener("pointerdown", this.handleDragStart, { signal: this.signal });
    // Ctlr State Watchers
    this.ctlr.state.watch("dimensions.container.width", () => (this.syncSize(), this.preview("")), { init: true, signal: this.signal });
  }

  public syncSize(): void {
    this.el.style.setProperty("display", "block", "important");
    const measurer = createEl("span", { className: "tmg-media-captions-text", innerHTML: "abcdefghijklmnopqrstuvwxyz".repeat(2) }, {}, { visibility: "hidden" });
    this.el.append(measurer);
    this.charW = measurer.offsetWidth / 52;
    const { lineHeight, fontSize } = getComputedStyle(measurer);
    this.lineHPx = !safeNum(parseFloat(lineHeight), 0) ? safeNum(parseFloat(fontSize), 16) * 1.2 : parseFloat(lineHeight);
    measurer.remove(), this.el.style.removeProperty("display");
  }

  public preview(cue: CueLike | string = `${capitalize(this.media.container.dataset.trackKind || "captions")} look like this`, flush = this.el.textContent.replace(/\s/g, "") === this.lastPreview?.replace(/\s/g, "")): void {
    const text = isStr(cue) ? cue : cue.text || "",
      should = flush || !this.ctlr.isUIActive("captions") || !this.el.textContent;
    should && this.media.container.classList.add("tmg-media-captions-preview");
    this.render(should ? (isObj(cue) ? cue : { text: cue }) : this.prevCue);
    clearTimeout(this.previewTimeoutId);
    this.previewTimeoutId = setTimeout((flush = this.el.textContent.replace(/\s/g, "") === text.replace(/\s/g, "")) => (this.media.container.classList.remove("tmg-media-captions-preview"), flush && (this.el.innerHTML = "")), this.ctlr.settings.captions.previewTimeout, this.signal);
    this.lastPreview = text;
  }

  public render(cue: CueLike | null): void {
    const existing = this.el.querySelector<HTMLElement>(".tmg-media-captions-wrapper");
    if (!cue) return existing?.remove();
    const wrapper = existing ?? createEl("div", { className: "tmg-media-captions-wrapper", ariaLive: "off", ariaAtomic: "true" }, { part: "cue-display" }),
      { offsetWidth: vCWidth, offsetHeight: vCHeight } = this.media.container,
      allowOverride = this.ctlr.settings.captions.allowMediaOverride || !this.isMain;
    ["style", "data-active", "data-scroll"].forEach((attr) => this.el.removeAttribute(attr));
    (wrapper.innerHTML = ""), (cue.text ||= ""), (this.prevCue = cue);
    const lines = cue.text.replace(/(<br\s*\/>)|\\N/gi, "\n").split(/\n/);
    for (const p of lines) formatVttLine(p, Math.floor(vCWidth / this.charW)).forEach((l) => wrapper.append(createEl("div", { className: "tmg-media-captions-line" }, cue.id ? { part: "cue", id: cue.id } : { part: "cue" }, allowOverride && cue.align ? { textAlign: cue.align } : undefined)!.appendChild(createEl("span", { className: "tmg-media-captions-text", innerHTML: parseVttText(l) })!).parentElement!));
    !existing && this.el.append(wrapper);
    const { offsetWidth: cWidth, offsetHeight: cHeight } = this.element;
    this.isMain ? (this.ctlr.settings.css.currentCaptionsContainerHeight = `${cHeight}px`) : this.el.style.setProperty("--tmg-media-current-captions-container-height", `${cHeight}px`);
    this.isMain ? (this.ctlr.settings.css.currentCaptionsContainerWidth = `${cWidth}px`) : this.el.style.setProperty("--tmg-media-current-captions-container-width", `${cWidth}px`);
    if (allowOverride) {
      if (cue.region) {
        this.el.setAttribute("data-active", "");
        const { width, lines: regionLines, viewportAnchorX: vpAnX, viewportAnchorY: vpAnY, scroll } = cue.region;
        if (isDef(vpAnX)) this.el.style.setProperty("--tmg-media-current-captions-x", `${vpAnX}%`);
        if (isDef(vpAnY)) this.el.style.setProperty("--tmg-media-current-captions-y", `${100 - Number(vpAnY)}%`);
        if (isDef(width)) this.el.style.maxWidth = `${width}%`;
        if (isDef(regionLines)) this.el.style.maxHeight = `${Number(regionLines) * ((this.lineHPx / vCHeight) * 100)}%`;
        if (scroll === "up") {
          this.el.style.maxHeight = `${regionLines! * ((this.lineHPx / vCHeight) * 100)}%`;
          this.el.dataset.scroll = scroll;
          this.ctlr.config.stall(() => (this.el.scrollTop = wrapper.scrollHeight));
        }
      } else {
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
            lineOffset = lAlign === "start" ? -2 * elHalfHPct : lAlign === "end" ? 0 : -elHalfHPct,
            bottomVal = cue.snapToLines ? (line < 0 ? (Math.abs(line) - 1) * lhPct : 100 - line * lhPct) : 100 - line;
          this.el.style.setProperty("--tmg-media-current-captions-y", `calc(${bottomVal}% + ${lineOffset}% + ${elHalfHPct}%)`);
        }
        if (isDef(cue.size) && cue.size !== 100) this.el.style.maxWidth = `${cue.size}%`;
      }
      if (cue.vertical) this.el.style.writingMode = cue.vertical === "lr" ? "vertical-lr" : "vertical-rl";
    }
    this.karaokeNodes = Array.from(wrapper.querySelectorAll<HTMLElement>("[data-part='timed']")).map((el) => {
      const [, m, s, ms] = (el.dataset.time || "").match(/(\d+):(\d+)\.(\d+)/) || [];
      return { el, time: m ? +m * 60 + +s + +ms / 1000 : 0 };
    });
    this.syncKaraoke();
  }

  public syncKaraoke(): void {
    if (!this.karaokeNodes) return;
    for (const { el, time } of this.karaokeNodes) {
      const isPast = safeNum(this.media.state.currentTime) > time;
      el.toggleAttribute("data-past", isPast), el.toggleAttribute("data-future", !isPast);
    }
  }

  protected handleDragStart(e: PointerEvent): void {
    this.el.setPointerCapture(e.pointerId);
    const { left, bottom } = getComputedStyle(this.element);
    (this.lastPosX = parseFloat(left)), (this.lastPosY = parseFloat(bottom));
    (this.lastPtrX = e.clientX), (this.lastPtrY = e.clientY);
    this.el.addEventListener("pointermove", this.handleDragging, { signal: this.signal });
    this.el.addEventListener("pointerup", this.handleDragEnd, { signal: this.signal });
  }

  protected handleDragging(e: PointerEvent): void {
    this.media.container.classList.add("tmg-media-captions-dragging");
    this.ctlr.RAFLoop("captionsDragging", () => {
      const { offsetWidth: ww, offsetHeight: hh } = this.media.container,
        { offsetWidth: w, offsetHeight: h } = this.element,
        posX = clamp(w / 2, this.lastPosX + (e.clientX - this.lastPtrX), ww - w / 2),
        posY = clamp(h / 2, this.lastPosY - (e.clientY - this.lastPtrY), hh - h / 2);
      this.isMain ? (this.ctlr.settings.css.currentCaptionsX = `${(posX / ww) * 100}%`) : this.el.style.setProperty("--tmg-media-current-captions-x", `${(posX / ww) * 100}%`);
      this.isMain ? (this.ctlr.settings.css.currentCaptionsY = `${(posY / hh) * 100}%`) : this.el.style.setProperty("--tmg-media-current-captions-y", `${(posY / hh) * 100}%`);
    });
  }

  protected handleDragEnd(): void {
    this.ctlr.cancelRAFLoop("captionsDragging");
    this.media.container.classList.remove("tmg-media-captions-dragging");
    this.el.removeEventListener("pointermove", this.handleDragging);
    this.el.removeEventListener("pointerup", this.handleDragEnd);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    captionsview: typeof CaptionsView;
  }
}
