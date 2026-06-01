import { RangeInput, type RangeInputConfig, type RangeState } from "../../rangeinput";
import type { Controller } from "@core/controller";
import type { CtlrMedia } from "@defs/contract";
import type { REvent } from "sia-reactor";

export type BrightnessSliderConfig = Partial<RangeInputConfig>;

export class BrightnessSlider extends RangeInput<RangeInputConfig, RangeState> {
  protected get plug() {
    return this.ctlr.plug("settings.brightness");
  }

  constructor(ctlr: Controller, config?: BrightnessSliderConfig) {
    super(ctlr, { label: "Brightness", ...config });
  }

  public override wire(): void {
    super.wire();
    // Ctlr Media Listeners
    this.media.on("state.brightness", this.handleBrightnessState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.brightness.max", ({ value }) => (this.config.max = value!), { init: true, signal: this.signal });
  }
  protected override seek(value: number): void {
    super.seek(value), this.plug?.handleSliderInput(value);
  }

  protected handleBrightnessState({ value }: REvent<CtlrMedia, "state.brightness">): void {
    this.config.previewValue = this.config.value = value;
  }
}
