import { RangeInput, type RangeInputConfig, type RangeState } from "../../rangeinput";
import type { Controller } from "@core/controller";
import type { CtlrMedia } from "@defs/contract";
import type { REvent } from "sia-reactor";

export type VolumeSliderConfig = Partial<RangeInputConfig>;

export class VolumeSlider extends RangeInput<RangeInputConfig, RangeState> {
  protected get plug() {
    return this.ctlr.plug("settings.volume");
  }

  constructor(ctlr: Controller, config?: VolumeSliderConfig) {
    super(ctlr, { label: "Volume", ...config });
  }

  public override wire(): void {
    super.wire();
    // Ctlr Media Listeners
    this.media.on("state.volume", this.handleVolumeState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.volume.max", ({ value }) => (this.config.max = value!), { init: true, signal: this.signal });
  }
  protected override seek(value: number): void {
    super.seek(value), this.plug?.handleSliderInput(value);
  }

  protected handleVolumeState({ value }: REvent<CtlrMedia, "state.volume">): void {
    this.config.previewValue = this.config.value = value;
  }
}
