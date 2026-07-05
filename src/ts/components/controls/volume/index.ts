import { BaseComponent, type ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";
import { setTimeout } from "@utils/fn";
import { VolumeSlider, type VolumeSliderConfig } from "./slider";

export type VolumeConfig = VolumeSliderConfig;

export class VolumeControl extends BaseComponent<VolumeConfig, ComponentState> {
  public static readonly componentName: string = "volume";
  public static readonly isControl: boolean = true;
  public slider!: VolumeSlider;
  protected button!: HTMLButtonElement;
  protected sliderWrapper!: HTMLSpanElement;
  protected delayActiveId?: number;
  protected get plug() {
    return this.ctlr.plug("settings.volume");
  }

  public override create(): HTMLElement {
    // Variables Assignments
    this.slider = new VolumeSlider(this.ctlr, this.config);
    this.element = createEl("div", { className: "tmg-media-volume-container tmg-media-vb-container" }, { draggableControl: "", controlId: this.name });
    this.button = createEl("button", { className: "tmg-media-mute-btn tmg-media-vb-btn", type: "button", innerHTML: IconRegistry.get("volumehigh") + IconRegistry.get("volumelow") + IconRegistry.get("volumemuted") });
    this.sliderWrapper = createEl("span", { className: "tmg-media-volume-slider-wrapper tmg-media-vb-slider-wrapper" });
    const sliderEl = this.slider.create();
    // DOM Injection
    sliderEl.classList.add("tmg-media-vb-slider", "tmg-media-volume-slider");
    this.sliderWrapper.append(sliderEl);
    return this.el.append(this.button, this.sliderWrapper), this.el;
  }

  public override mount(): void {
    this.slider.setup();
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.volume", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.button.addEventListener("click", this.handleClick, { signal: this.signal });
    this.el.addEventListener("mousemove", this.startActive, { signal: this.signal });
    this.el.addEventListener("mouseleave", this.stopActive, { signal: this.signal });
    // State Listeners
    this.slider.config.on("value", this.delayActive, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.volume", this.syncARIA, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.muted", this.syncARIA, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.mute", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.toggle("auto");
  }

  protected startActive(): void {
    this.slider.active(), this.delayActive();
  }
  protected delayActive(): void {
    this.ctlr.plug("settings.overlay")?.delay();
    clearTimeout(this.delayActiveId);
    this.delayActiveId = setTimeout(() => this.stopActive(), this.settings.overlay.delay, this.signal);
  }
  protected stopActive(): void {
    if (this.slider.el.matches(":active")) return this.delayActive();
    clearTimeout(this.delayActiveId), this.slider.inactive();
    this.slider.config.previewValue = this.slider.config.value;
  }

  public syncARIA(): void {
    this.state.label = this.media.state.muted || this.media.state.volume === 0 ? "Unmute" : "Mute";
    this.state.cmd = formatKeyForDisplay(this.settings.keys.shortcuts.mute);
    this.button.title = this.state.label + this.state.cmd;
    this.setBtnARIA(undefined, this.button);
  }

  protected override onDestroy(): void {
    this.slider.destroy(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    volume: typeof VolumeControl;
  }
}
