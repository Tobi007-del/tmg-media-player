import { BaseComponent } from "../base";
import { RangeInputConfig, RangeState } from "./types";
import { RANGE_INPUT_BUILD } from "./build";
import type { Controller } from "@core/controller";
import { type REvent, reactive, type Reactive } from "sia-reactor";
import { mergeObjs } from "sia-reactor/utils";
import { createEl } from "@utils/dom";
import { clamp, stepNum } from "@utils/num";
import { setTimeout } from "@utils/fn";

export class RangeInput<Config extends RangeInputConfig = RangeInputConfig, State extends RangeState = RangeState> extends BaseComponent<Reactive<Config>, State, HTMLDivElement> {
  public declare config: Reactive<Config> & Reactive<RangeInputConfig>;
  public static readonly componentName: string = "range";
  public barsWrapper!: HTMLElement;
  public baseBar!: HTMLElement;
  public valueBar!: HTMLElement;
  public previewBar!: HTMLElement;
  public thumbEl!: HTMLElement;
  public tooltipEl!: HTMLElement;
  public isVertical = false;
  public isRTL = false;
  protected rect!: DOMRect;
  protected lastPtrPos = 0;
  protected lastThumbPos = 0;
  protected currentThumbPos = 0;
  protected stallCancelScrub = false;
  protected cancelScrubTimeoutId: number | null = null;

  constructor(ctlr: Controller, config?: Partial<Config>, state?: Partial<State>) {
    super(ctlr, reactive(mergeObjs(structuredClone(RANGE_INPUT_BUILD), config) as unknown as Reactive<Config>, { scrubbing: false, shouldCancelScrub: false, ...state } as State));
  }

  public override create() {
    // Variables Assignments
    this.element = createEl("div", { className: "tmg-media-range-container", tabIndex: 0, role: "slider" });
    this.barsWrapper = createEl("div", { className: "tmg-media-range-bars-wrapper" });
    this.baseBar = createEl("div", { className: "tmg-media-range-bar tmg-media-range-base-bar" });
    this.valueBar = createEl("div", { className: "tmg-media-range-bar tmg-media-range-value-bar" });
    this.previewBar = createEl("div", { className: "tmg-media-range-bar tmg-media-range-preview-bar" });
    this.thumbEl = createEl("div", { className: "tmg-media-range-thumb" });
    this.tooltipEl = createEl("div", { className: "tmg-media-range-tooltip" });
    // DOM Injection
    this.barsWrapper.append(this.baseBar, this.previewBar, this.valueBar);
    return this.el.append(this.barsWrapper, this.thumbEl, this.tooltipEl), this.el;
  }

  public override wire(): void {
    // Variables Asignments
    this.rect = this.el.getBoundingClientRect();
    // Event Listeners
    this.el.addEventListener("pointerdown", this.handlePointerDown, { signal: this.signal });
    this.el.addEventListener("mouseenter", () => (this.rect = this.el.getBoundingClientRect()), { signal: this.signal });
    this.el.addEventListener("keydown", this.handleKeyDown, { signal: this.signal });
    this.el.addEventListener("wheel", this.handleWheel, { passive: false, signal: this.signal });
    this.barsWrapper.addEventListener("mousemove", this.handleInput, { signal: this.signal });
    ["mouseleave", "touchend", "touchcancel"].forEach((e) => this.barsWrapper.addEventListener(e, this.stopPreview, { signal: this.signal }));
    // State Listeners
    this.state.on("shouldCancelScrub", ({ value: v }) => this.el.toggleAttribute("data-cancel-scrub", !!v), { signal: this.signal });
    // Config Setters
    this.config.set("value", (value) => stepNum(value, this.config), { signal: this.signal });
    // ------ Listeners
    this.config.on("label", ({ value }) => (this.el.ariaLabel = value!), { init: true, signal: this.signal });
    this.config.on("min", ({ value }) => (this.el.ariaValueMin = String(value!)), { init: true, signal: this.signal });
    this.config.on("max", ({ value }) => (this.el.ariaValueMax = String(value!)), { init: true, signal: this.signal });
    this.config.on("value", this.handleValue, { init: true, signal: this.signal });
    this.config.watch("previewValue", this.handlePreviewValue, { init: true, signal: this.signal });
    this.config.on("tooltip", ({ value }) => this.el.toggleAttribute("data-tooltip", !!value), { init: true, signal: this.signal });
  }
  protected seek(value: number): void {
    this.config.value = value;
  }

  protected handleValue({ value }: REvent<RangeInputConfig, "value">): void {
    const pos = this.getValueAsPos();
    this.syncElPos(this.thumbEl, pos, false, "auto"), this.syncElPos(this.valueBar, pos, true);
    if (!this.state.scrubbing) this.el.ariaValueNow = String(value);
  }
  protected handlePreviewValue(value: number) {
    const pos = this.getValueAsPos(value);
    this.syncElPos(this.previewBar, this.config.preview ? pos : 0, true);
    if (this.config.tooltip) this.syncElPos(this.tooltipEl, pos, false, "auto", this.thumbEl), (this.tooltipEl.textContent = `${Math.round(value)}`);
  }

  protected handlePointerDown(e: PointerEvent): void {
    if (this.state.scrubbing) return;
    this.state.scrubbing = true;
    this.el.setPointerCapture(e.pointerId);
    const s = window.getComputedStyle(this.el);
    (this.isVertical = s.writingMode.includes("vertical")), (this.isRTL = s.direction === "rtl");
    (this.lastPtrPos = this.getPos(e)), (this.lastThumbPos = this.currentThumbPos = this.getValueAsPos());
    this.handleInput(e);
    window.addEventListener("pointermove", this.handleInput, { signal: this.signal });
    window.addEventListener("pointerup", this.stopScrubbing, { signal: this.signal }), window.addEventListener("pointercancel", this.stopScrubbing, { signal: this.signal });
  }

  protected stopScrubbing(): void {
    if (!this.state.scrubbing) return;
    this.state.scrubbing = false;
    this.seek(this.getPosAsValue(this.state.shouldCancelScrub ? this.lastThumbPos : this.currentThumbPos));
    this.allowScrubbing();
    this.stallCancelScrub = true;
    window.removeEventListener("pointermove", this.handleInput);
    window.removeEventListener("pointerup", this.stopScrubbing), window.removeEventListener("pointercancel", this.stopScrubbing);
  }
  protected stopPreview(): void {} // Subclasses can override to add preview cleanup logic

  protected cancelScrubbing(): void {
    if (this.stallCancelScrub || this.state.shouldCancelScrub || this.cancelScrubTimeoutId) return;
    this.state.shouldCancelScrub = true;
    this.cancelScrubTimeoutId = setTimeout(() => this.allowScrubbing(false), this.config.scrub.cancel.timeout, this.signal);
  }
  protected allowScrubbing(reset = true): void {
    this.stallCancelScrub = this.state.shouldCancelScrub = false;
    clearTimeout(this.cancelScrubTimeoutId!);
    if (reset) this.cancelScrubTimeoutId = null;
  }

  protected handleInput(e: MouseEvent | PointerEvent): void {
    const dimension = this.isVertical ? this.rect.height : this.rect.width,
      progress = this.getPos(e),
      pos = (this.currentThumbPos = clamp(0, !this.state.scrubbing || this.config.scrub.relative ? progress : this.lastThumbPos + progress - this.lastPtrPos, 1)),
      value = this.getPosAsValue(pos);
    this.config.previewValue = value;
    if (this.state.scrubbing) {
      !this.config.scrub.sync ? this.syncElPos(this.thumbEl, pos, false, "auto") : this.seek(value);
      Math.abs(pos - this.lastThumbPos) < this.config.scrub.cancel.delta / dimension ? this.cancelScrubbing() : this.allowScrubbing();
    }
    this.onInput(e, pos);
  }
  protected onInput(_e: MouseEvent | PointerEvent, _pos: number): void {} // Subclasses override to add preview logic (timeline preview image, etc.)

  protected handleWheel(e: WheelEvent): void {
    if (this.config.wheel.disabled) return;
    e.preventDefault(), e.stopImmediatePropagation();
    const dimension = this.isVertical ? window.innerHeight : window.innerWidth,
      pos = clamp(0, Math.abs(-e.deltaY), dimension * this.config.wheel.axisRatio) / (dimension * this.config.wheel.axisRatio),
      value = this.config.value + (-e.deltaY >= 0 ? pos : -pos) * (this.config.max - this.config.min);
    this.seek(Math.round(value));
  }
  protected handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key?.toLowerCase();
    if (["arrowleft", "arrowdown", "arrowright", "arrowup"].includes(key)) {
      e.preventDefault(), e.stopImmediatePropagation();
      const delta = e.shiftKey ? 2 : 1,
        direction = ["arrowleft", "arrowdown"].includes(key) ? -1 : 1;
      this.seek(this.config.value + direction * delta * this.config.step);
    }
  };

  protected getValueAsPos(value = this.config.value): number {
    return (value - this.config.min) / (this.config.max - this.config.min);
  }
  protected getPosAsValue(pos: number): number {
    return pos * (this.config.max - this.config.min) + this.config.min;
  }
  protected getPos(e: MouseEvent | PointerEvent): number {
    const p = this.isVertical ? (e.clientY - this.rect.top) / this.rect.height : (e.clientX - this.rect.left) / this.rect.width;
    return clamp(0, this.isRTL ? 1 - p : p, 1);
  }
  public syncElPos(el: HTMLElement, pos: number, isSize = false, inBounds: boolean | "auto" = false, bounds = el): void {
    if (this.rect.width === 0 || this.rect.height === 0) this.rect = this.el.getBoundingClientRect();
    const min = inBounds ? bounds.offsetWidth / 2 / (isSize ? this.rect.height : this.rect.width) : 0;
    pos = inBounds === "auto" ? min + pos * (1 - min * 2) : pos;
    el.style.cssText = `${this.isVertical ? (isSize ? "block-size" : "inset-block-end") : isSize ? "inline-size" : "inset-inline-start"}: ${clamp(min, pos, 1 - min) * 100}%`;
    // el.style.transform = this.isVertical ? (isSize ? `scaleY(${pos})` : `translateY(-${pos * 100}%)`) : (isSize ? `scaleX(${pos})` : `translateX(${pos * 100}%)`);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    rangeinput: typeof RangeInput;
  }
}

export type * from "./types";
