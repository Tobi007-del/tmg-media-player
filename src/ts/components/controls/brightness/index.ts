import { BaseComponent, type ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { setTimeout } from "@utils/fn";
import { formatKeyForDisplay } from "@utils/keys";
import { BrightnessSlider, type BrightnessSliderConfig } from "./slider";

export type BrightnessConfig = BrightnessSliderConfig;

export class BrightnessControl extends BaseComponent<BrightnessConfig, ComponentState> {
  public static readonly componentName: string = "brightness";
  public static readonly isControl: boolean = true;
  public slider!: BrightnessSlider;
  protected button!: HTMLButtonElement;
  protected sliderWrapper!: HTMLSpanElement;
  protected delayActiveId?: number;
  protected get plug() {
    return this.ctlr.plug("settings.brightness");
  }

  public override create(): HTMLElement {
    // Variables Assignments
    this.slider = new BrightnessSlider(this.ctlr, this.config);
    this.element = createEl("div", { className: "tmg-media-brightness-container tmg-media-vb-container" }, { draggableControl: "", controlId: this.name });
    this.button = createEl("button", { className: "tmg-media-dark-btn tmg-media-vb-btn", type: "button", innerHTML: IconRegistry.get("brightnesshigh") + IconRegistry.get("brightnesslow") + IconRegistry.get("brightnessdark") });
    this.sliderWrapper = createEl("span", { className: "tmg-media-brightness-slider-wrapper tmg-media-vb-slider-wrapper" });
    const sliderEl = this.slider.create();
    // DOM Injection
    sliderEl.classList.add("tmg-media-vb-slider", "tmg-media-brightness-slider");
    this.sliderWrapper.append(sliderEl);
    return this.el.append(this.button, this.sliderWrapper), this.el;
  }

  public override mount(): void {
    this.slider.setup();
  }

  public override wire(): void {
    // Event Listeners
    this.button.addEventListener("click", this.handleClick, { signal: this.signal });
    this.el.addEventListener("mousemove", this.startActive, { signal: this.signal });
    this.el.addEventListener("mouseleave", this.stopActive, { signal: this.signal });
    // State Listeners
    this.slider.config.on("value", this.delayActive, { signal: this.signal });
    // ---- Media Listeners
    this.media.on("state.brightness", this.syncARIA, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.dark", this.syncARIA, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.dark", this.syncARIA, { signal: this.signal });
    // Features Gating
    this.media.on("features.brightness", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
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
  protected stopActive = (): void => {
    if (this.slider.el.matches(":active")) return this.delayActive();
    clearTimeout(this.delayActiveId), this.slider.inactive();
    this.slider.config.previewValue = this.slider.config.value;
  };

  public syncARIA(): void {
    this.state.label = this.media.state.dark || this.media.state.brightness === 0 ? "Brighten" : "Darken";
    this.state.cmd = formatKeyForDisplay(this.settings.keys.shortcuts.dark);
    this.button.title = this.state.label + this.state.cmd;
    this.setBtnARIA(undefined, this.button);
  }

  protected override onDestroy(): void {
    this.slider.destroy(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    brightness: typeof BrightnessControl;
  }
}
