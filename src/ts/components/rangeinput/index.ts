import { BaseComponent } from "../base";
import { RangeInputChunk, RangeInputConfig, RangeState } from "./types";
import { RANGE_INPUT_BUILD } from "./build";
import type { Controller } from "@core/controller";
import { reactive, type Reactive } from "sia-reactor";
import { deepClone, mergeObjs } from "sia-reactor/utils";
import { createEl, getWindow, observeResize } from "@utils/dom";
import { clamp, stepNum } from "@utils/num";
import { setTimeout } from "@utils/fn";
import { startTx, endTx, Transaction } from "sia-reactor/modules";

export class RangeInput<Config extends RangeInputConfig = RangeInputConfig, State extends RangeState = RangeState> extends BaseComponent<Reactive<Config>, State, HTMLDivElement> {
  public declare config: Reactive<Config> & Reactive<RangeInputConfig>;
  public static readonly componentName: string = "rangeInput";
  public barsWrapper!: HTMLElement;
  public marksWrapper!: HTMLElement;
  public chunks: RangeInputChunk[] = [];
  public thumbEl!: HTMLElement;
  public tooltipEl!: HTMLElement;
  public marksActive = false;
  public isVertical = false;
  public isRTL = false;
  protected rect!: DOMRect;
  protected lastPtrPos = 0;
  protected lastThumbPos = 0;
  protected currentThumbPos = 0;
  protected stallCancelScrub = false;
  protected cancelScrubTimeoutId: number | null = null;
  protected tx: Transaction | null = null;

  constructor(ctlr: Controller, config?: Partial<Config>, state?: Partial<State>) {
    super(ctlr, reactive(mergeObjs(deepClone(RANGE_INPUT_BUILD), config) as unknown as Reactive<Config>, { scrubbing: false, previewing: false, cancelScrub: false, ...state } as any));
  }

  public override create() {
    // Variables Assignments
    this.element = createEl("div", { className: "tmg-media-range-container", tabIndex: 0, role: "slider" });
    this.barsWrapper = createEl("div", { className: "tmg-media-range-bars-wrapper" });
    this.marksWrapper = createEl("div", { className: "tmg-media-range-marks-wrapper" });
    this.thumbEl = createEl("div", { className: "tmg-media-range-thumb" });
    this.tooltipEl = createEl("div", { className: "tmg-media-range-tooltip" });
    // DOM Injection
    return this.el.append(this.barsWrapper, this.marksWrapper, this.thumbEl, this.tooltipEl), this.el;
  }

  public override wire(): void {
    // Variables Asignments
    this.rect = this.el.getBoundingClientRect();
    // Event Listeners
    this.el.addEventListener("pointerdown", this.handlePointerDown, { signal: this.signal });
    this.el.addEventListener("keydown", this.handleKeyDown, { signal: this.signal });
    this.el.addEventListener("wheel", this.handleWheel, { passive: false, signal: this.signal });
    this.el.addEventListener("mouseover", () => (this.rect = this.el.getBoundingClientRect()), { signal: this.signal });
    this.el.addEventListener("mousemove", this.handleInput, { signal: this.signal });
    for (const e of ["mouseleave", "touchend", "touchcancel"]) this.el.addEventListener(e, this.stopPreviewing, { signal: this.signal });
    // State Watchers
    this.state.watch("scrubbing", (value) => (value ? (this.tx = startTx(`${this.config.label} scrub`)) : this.tx && this.config.stall(() => (endTx(this.tx!), (this.tx = null)))), { signal: this.signal });
    // ----- Listeners
    this.state.on("previewing", ({ value }) => this.el.classList.toggle("tmg-media-control-previewing", !!value), { signal: this.signal });
    this.state.on("scrubbing", ({ value }) => this.el.classList.toggle("tmg-media-control-scrubbing", !!value), { signal: this.signal });
    this.state.on("cancelScrub", ({ value }) => this.el.classList.toggle("tmg-media-control-cancel-scrub", !!value), { signal: this.signal });
    // Config Setters
    this.config.set("value", (value) => stepNum(value, this.config), { signal: this.signal });
    // ----- Watchers
    this.config.watch("value", this.onValue, { init: true, signal: this.signal }); // #SYNC: near native speed
    this.config.watch("previewValue", this.onPreviewValue, { init: true, signal: this.signal }); // #SYNC: near native speed
    // ----- Listeners
    this.config.on("label", ({ value }) => (this.el.ariaLabel = value!), { init: true, signal: this.signal });
    this.config.on("min", ({ value }) => (this.el.ariaValueMin = String(value!)), { init: true, signal: this.signal });
    this.config.on("max", ({ value }) => (this.el.ariaValueMax = String(value!)), { init: true, signal: this.signal });
    this.config.on("tooltip", ({ value }) => this.el.toggleAttribute("tooltip", !!value), { init: true, signal: this.signal });
    this.config.on("readonly", ({ value }) => this.el.toggleAttribute("readonly", !!value), { init: true, signal: this.signal });
    this.config.on("disabled", ({ value }) => this.el.toggleAttribute("disabled", !!value), { init: true, signal: this.signal });
    this.config.on("divs", ({ currentTarget: { value } }) => this.syncDivs(value), { init: true, signal: this.signal });
    this.config.on("marks", ({ currentTarget: { value } }) => this.syncMarks(value), { init: true, signal: this.signal });
    // Post Wiring
    observeResize(this.el, () => this.ctlr.throttle(`${this.config.label}Resizing`, this.handleResize, 30, false, this.signal), this.signal);
  }
  public get canScrub(): boolean {
    return !this.config.readonly && !this.config.disabled;
  }
  protected scrub(value: number, bypass = false): boolean {
    return this.canScrub ? (!bypass ? (this.config.value = value) : this.onValue(value), true) : false;
  }

  protected onValue(value: number): void {
    this.syncElPos(this.thumbEl, this.getValuePos(value), false, "auto"), this.syncChunks("value", value);
    if (!this.state.scrubbing) this.el.ariaValueNow = String(value);
  }
  protected onPreviewValue(value: number): void {
    this.syncChunks("preview", value), this.config.tooltip && (this.syncElPos(this.tooltipEl, this.getValuePos(value), false, !(this.state.previewing && !this.state.scrubbing) ? "auto" : false, this.thumbEl), (this.tooltipEl.innerHTML = `${this.config.formatTooltip ? this.config.formatTooltip(value) : Math.round(value)} ${this.getValueChunk(value)?.label || ""}`.trim()));
  }

  protected handlePointerDown(e: PointerEvent, t = e.target as HTMLElement): void {
    if (this.state.scrubbing || this.config.readonly || this.config.disabled || (this.marksActive && t?.matches?.(".tmg-media-range-mark"))) return;
    this.state.scrubbing = true;
    this.el.setPointerCapture(e.pointerId);
    const s = getWindow(this.el).getComputedStyle(this.el);
    (this.isVertical = s.writingMode.includes("vertical")), (this.isRTL = s.direction === "rtl");
    (this.rect = this.el.getBoundingClientRect()), (this.lastPtrPos = this.getPos(e)), (this.lastThumbPos = this.currentThumbPos = this.getValuePos());
    getWindow(this.el).addEventListener("pointermove", this.handleInput, { signal: this.signal }), this.handleInput(e);
    getWindow(this.el).addEventListener("pointerup", this.stopScrubbing, { signal: this.signal }), getWindow(this.el).addEventListener("pointercancel", this.stopScrubbing, { signal: this.signal });
  }

  protected stopScrubbing(): void {
    if (!this.state.scrubbing) return;
    this.state.scrubbing = this.state.previewing = false;
    this.ctlr.cancelRAFLoop(`${this.config.label}Inputing`);
    this.scrub(this.getPosValue(this.state.cancelScrub ? this.lastThumbPos : this.currentThumbPos), this.state.cancelScrub);
    this.allowScrubbing(), this.stopPreviewing();
    this.stallCancelScrub = true;
    getWindow(this.el).removeEventListener("pointermove", this.handleInput);
    getWindow(this.el).removeEventListener("pointerup", this.stopScrubbing), getWindow(this.el).removeEventListener("pointercancel", this.stopScrubbing);
  }
  protected stopPreviewing(): void {
    if (!this.state.previewing) return;
    this.state.previewing = false;
    !this.state.scrubbing && this.ctlr.cancelRAFLoop(`${this.config.label}Inputing`);
  }

  protected cancelScrubbing(): void {
    if (this.stallCancelScrub || this.state.cancelScrub || this.cancelScrubTimeoutId) return;
    this.state.cancelScrub = true;
    this.cancelScrubTimeoutId = setTimeout(() => this.allowScrubbing(false), this.config.scrub.cancel.timeout, this.signal);
  }
  protected allowScrubbing(reset = true): void {
    this.stallCancelScrub = this.state.cancelScrub = false;
    clearTimeout(this.cancelScrubTimeoutId!);
    if (reset) this.cancelScrubTimeoutId = null;
  }

  protected handleInput(e: MouseEvent | PointerEvent): void {
    if (this.config.readonly || this.config.disabled) return;
    this.ctlr.RAFLoop(`${this.config.label}Inputing`, () => {
      if (this.prevEX === e.clientX && this.prevEY === e.clientY) return; // #CONSERVATION: peak stays peak
      (this.prevEX = e.clientX), (this.prevEY = e.clientY);
      this.state.previewing ||= true;
      const progress = this.getPos(e),
        pos = (this.currentThumbPos = clamp(0, !this.state.scrubbing || this.config.scrub.relative ? progress : this.lastThumbPos + progress - this.lastPtrPos, 1));
      this.config.previewValue = this.getPosValue(pos);
      if (this.state.scrubbing) {
        !this.config.scrub.sync ? this.syncElPos(this.thumbEl, pos, false, "auto") : this.scrub(this.config.previewValue);
        Math.abs(pos - this.lastThumbPos) < this.config.scrub.cancel.delta / this.prefDim ? this.cancelScrubbing() : this.allowScrubbing();
      }
      this.onInput(e, pos);
    }); // #PERK: no accidental scrub
  }
  private prevEX?: number;
  private prevEY?: number;
  protected onInput(_e: MouseEvent | PointerEvent, _pos: number): void {} // override to safely add preview logic (timeline preview image, etc.)

  protected handleWheel(e: WheelEvent): void {
    if (this.config.wheel.disabled) return;
    e.preventDefault(), e.stopImmediatePropagation();
    const dimension = this.isVertical ? getWindow(this.el).innerHeight : getWindow(this.el).innerWidth,
      pos = clamp(0, Math.abs(-e.deltaY), dimension * this.config.wheel.axisRatio) / (dimension * this.config.wheel.axisRatio);
    this.scrub(this.config.value + (-e.deltaY >= 0 ? pos : -pos) * (this.config.max - this.config.min));
  }
  protected handleKeyDown(e: KeyboardEvent, key = e.key?.toLowerCase()): void {
    if (/^(arrowleft|arrowdown|arrowright|arrowup)$/.test(key)) e.preventDefault(), e.stopImmediatePropagation(), this.scrub(this.config.value + (/^(arrowleft|arrowdown)$/.test(key) ? -1 : 1) * (e.shiftKey ? 2 : 1) * (this.config.step === "any" ? 1 : this.config.step));
  }

  protected handleResize(): void {
    this.rect = this.el.getBoundingClientRect();
    const pos = this.getValuePos();
    this.syncElPos(this.thumbEl, pos, false, "auto"), this.syncChunks("value", this.config.value), this.config.tooltip && this.syncElPos(this.tooltipEl, pos, false, "auto", this.thumbEl);
  }

  protected getValuePos(value = this.config.value, range = this.config.max - this.config.min): number {
    return range ? (value - this.config.min) / range : 0;
  }
  protected getPosValue(pos: number): number {
    return pos * (this.config.max - this.config.min) + this.config.min;
  }
  protected getValueChunk(value = this.config.value): RangeInputChunk | undefined {
    for (let i = 0, len = this.chunks.length; i < len; i++) {
      const c = this.chunks[i];
      if (value >= c.start && value <= c.end) return c;
    }
  }
  protected getPos(e: MouseEvent | PointerEvent): number {
    const p = this.isVertical ? (e.clientY - this.rect.top) / this.rect.height : (e.clientX - this.rect.left) / this.rect.width;
    return clamp(0, this.isRTL ? 1 - p : p, 1);
  }
  public get prefDim(): number {
    return this.isVertical ? this.rect.height : this.rect.width;
  }

  public syncElPos(el: HTMLElement, pos: number, isSize = false, inBounds: boolean | "auto" = false, bounds = el): void {
    const min = inBounds ? (this.isVertical ? bounds.offsetHeight : bounds.offsetWidth) / 2 / this.prefDim : 0;
    pos = inBounds === "auto" ? min + pos * (1 - min * 2) : pos;
    const value = pos || (!isSize && pos === 0) ? `${clamp(min, pos, 1 - min) * 100}%` : ""; // onresize still for pixel accuracy, debounce won't stutter due to '%'
    if (isSize) this.isVertical ? ((el.style.blockSize = value), (el.style.inlineSize = "")) : ((el.style.inlineSize = value), (el.style.blockSize = ""));
    else this.isVertical ? ((el.style.insetBlockEnd = value), (el.style.insetInlineStart = "")) : ((el.style.insetInlineStart = value), (el.style.insetBlockEnd = ""));
    // el.style.transform = this.isVertical ? (isSize ? `scaleY(${pos})` : `translateY(-${pos * 100}%)`) : (isSize ? `scaleX(${pos})` : `translateX(${pos * 100}%)`);
  }
  protected syncChunks(key: keyof Omit<RangeInputChunk, "start" | "end" | "size" | "el" | "label">, value: number): void {
    const pos = this.getValuePos(value),
      minOff = !(this.state.previewing && !this.state.scrubbing) ? (this.isVertical ? this.thumbEl.offsetHeight : this.thumbEl.offsetWidth) / 2 / this.prefDim : 0,
      offVal = this.getPosValue(minOff + pos * (1 - minOff * 2));
    for (let i = 0, len = this.chunks.length; i < len; i++) {
      const c = this.chunks[i];
      this.syncElPos(c[key]!, clamp(0, (offVal - c.start) / c.size, 1) || 0, true);
      c[key]!.style.setProperty("--tmg-media-current-range-pos", String(this.getValuePos(offVal)));
      c.el.classList.toggle(`tmg-media-chunk-${key}-active`, value >= c.start && value <= c.end);
    }
  }
  protected syncDivs(divs = this.config.divs): void {
    (this.barsWrapper.innerHTML = ""), (this.chunks = []);
    const range = this.config.max - this.config.min,
      stops = divs.toSorted((a, b) => a.value - b.value); // Sort divs chronologically
    if (stops.length && stops[0].value > this.config.min && stops[0].value <= this.config.min + Math.min(0.02 * range, range * 0.25)) stops[0].value = this.config.min;
    else if (!stops.length || stops[0].value > this.config.min) stops.unshift({ value: this.config.min, label: "" });
    if (stops[stops.length - 1].value < this.config.max) stops.push({ value: this.config.max, label: "" });
    const fragment = document.createDocumentFragment();
    for (let i = 0, len = stops.length; i < len - 1; i++) {
      // prettier-ignore
      const start = stops[i], end = stops[i + 1], size = end.value - start.value;
      if (size <= 0) continue;
      const el = createEl("div", { className: "tmg-media-range-chunk" }, undefined, { cssText: `--tmg-media-current-chunk-st: ${(start.value - this.config.min) / range};` }),
        chunk = { base: createEl("div", { className: "tmg-media-range-bar tmg-media-range-base-bar" }), preview: createEl("div", { className: "tmg-media-range-bar tmg-media-range-preview-bar" }), value: createEl("div", { className: "tmg-media-range-bar tmg-media-range-value-bar" }) };
      this.syncElPos(el, size / range, true), fragment.append((el.append(chunk.base, chunk.preview, chunk.value), el)), this.chunks.push({ start: start.value, end: end.value, label: start.label, size, el, ...chunk });
    }
    this.barsWrapper.append(fragment), this.onValue(this.config.value), this.onPreviewValue(this.config.previewValue);
  }
  protected syncMarks(marks = this.config.marks): void {
    this.marksWrapper.innerHTML = "";
    const els: HTMLElement[] = [],
      range = this.config.max - this.config.min;
    if (range <= 0) return;
    for (let i = 0, len = marks.length; i < len; i++) {
      const m = marks[i],
        el = createEl("div", { className: `tmg-media-range-mark tmg-media-range-${m.type || "base"}-mark`, title: m.label || `${m.start}${m.end && m.end > m.start + 1 ? ` - ${m.end}` : ""}  Mark`, tabIndex: this.marksActive ? 0 : -1, onclick: this.marksActive ? () => this.scrub(m.start) : undefined, onkeydown: this.marksActive ? (e) => (/^(Enter| )$/.test(e.key) ? this.scrub(m.start) : null) : undefined }, undefined);
      this.syncElPos(el, (m.start - this.config.min) / range, false), this.syncElPos(el, m.end ? (m.end - m.start) / range : 0, true), els.push(el);
    }
    this.marksWrapper.append(...els);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    rangeInput: typeof RangeInput;
  }
}

export type * from "./types";
