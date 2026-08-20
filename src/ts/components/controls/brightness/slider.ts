import { CtlrConfig } from "@defs/config";
import { RangeInput, type RangeInputConfig, type RangeState } from "../../rangeInput";
import type { Controller } from "@core/controller";
import type { CtlrMedia } from "@defs/contract";
import type { REvent } from "sia-reactor";

export type BrightnessSliderConfig = Partial<RangeInputConfig>;

export class BrightnessSlider extends RangeInput<RangeInputConfig, RangeState> {
  protected get plug() {
    return this.ctlr.plug("settings.brightness");
  }

  constructor(ctlr: Controller, config?: BrightnessSliderConfig) {
    super(ctlr, { label: "Brightness slider", ...config });
  }

  public override wire(): void {
    super.wire();
    // Config Listeners
    this.config.set("value", (v) => Math.max(this.plug?.shouldToggle ? 0 : this.settings.brightness.min, v), { signal: this.signal }); // #VALIDATOR: rules enforcement
    this.config.set("previewValue", (v) => Math.max(this.plug?.shouldToggle ? 0 : this.settings.brightness.min, v), { signal: this.signal }); // #VALIDATOR: rules enforcement
    // Ctlr Media Listeners
    this.media.on("state.brightness", this.handleBrightnessState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.brightness.max", this.handleBrightnessMax, { init: true, signal: this.signal });
  }
  protected override scrub(value: number, bypass?: boolean): boolean {
    return super.scrub(value, bypass) ? (this.plug?.handleSliderInput(value), true) : false;
  }

  protected handleBrightnessState({ value }: REvent<CtlrMedia, "state.brightness">): void {
    if (!this.state.scrubbing) this.config.previewValue = this.config.value = value;
  }

  protected handleBrightnessMax({ value }: REvent<CtlrConfig, "settings.brightness.max">): void {
    this.config.max = value;
    // prettier-ignore
    this.config.divs = value > 100 ? [{ value: 0, label: "" }, { value: 100, label: `<strong style="color: var(--tmg-media-range-track-boost-color, red); vertical-align: 4%;">↑</strong>` },] : [];
  }
}
