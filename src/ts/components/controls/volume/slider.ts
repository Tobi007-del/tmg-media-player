import { CtlrConfig } from "@defs/config";
import { RangeInput, type RangeInputConfig, type RangeState } from "../../rangeInput";
import type { Controller } from "@core/controller";
import type { CtlrMedia } from "@defs/contract";
import type { REvent } from "sia-reactor";

export type VolumeSliderConfig = Partial<RangeInputConfig>;

export class VolumeSlider extends RangeInput<RangeInputConfig, RangeState> {
  protected get plug() {
    return this.ctlr.plug("settings.volume");
  }

  constructor(ctlr: Controller, config?: VolumeSliderConfig) {
    super(ctlr, { label: "Volume slider", ...config });
  }

  public override wire(): void {
    super.wire();
    // Config Listeners
    this.config.set("value", (v) => Math.max(this.plug?.shouldToggle ? 0 : this.settings.volume.min, v), { signal: this.signal }); // #VALIDATOR: rules enforcement
    this.config.set("previewValue", (v) => Math.max(this.plug?.shouldToggle ? 0 : this.settings.volume.min, v), { signal: this.signal }); // #VALIDATOR: rules enforcement
    // Ctlr Media Listeners
    this.media.on("state.volume", this.handleVolumeState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.volume.max", this.handleVolumeMax, { init: true, signal: this.signal });
  }
  protected override scrub(value: number, bypass?: boolean): boolean {
    return super.scrub(value, bypass) ? (this.plug?.handleSliderInput(value), true) : false;
  }

  protected handleVolumeState({ value }: REvent<CtlrMedia, "state.volume">): void {
    if (!this.state.scrubbing) this.config.previewValue = this.config.value = value;
  }

  protected handleVolumeMax({ value }: REvent<CtlrConfig, "settings.volume.max">): void {
    this.config.max = value;
    // prettier-ignore
    this.config.divs = value > 100 ? [{ value: 0, label: "" }, { value: 100, label: `<strong style="color: var(--tmg-media-range-track-boost-color, red); vertical-align: 4%;">↑</strong>` },] : [];
  }
}
