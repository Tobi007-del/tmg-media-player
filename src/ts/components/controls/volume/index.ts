import { BaseComponent, type ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";
import { setTimeout } from "@utils/fn";
import { canMorphSVG } from "@utils/str";
import { VolumeSlider, type VolumeSliderConfig } from "./slider";

export type VolumeConfig = VolumeSliderConfig;

export class VolumeControl extends BaseComponent<VolumeConfig, ComponentState> {
  public static readonly componentName: string = "volume";
  public static readonly isControl: boolean = true;
  public slider!: VolumeSlider;
  protected button!: HTMLButtonElement;
  protected sliderWrapper!: HTMLSpanElement;
  protected delayActiveId?: number;
  protected paths?: string[][] | null;
  protected get plug() {
    return this.ctlr.plug("settings.volume");
  }

  public override create(): HTMLElement {
    // Variables Assignments
    this.paths = canMorphSVG(IconRegistry.get("volumeHigh", true), IconRegistry.get("volumeLow", true), IconRegistry.get("volumeMuted", true));
    this.slider = new VolumeSlider(this.ctlr, this.config);
    this.element = createEl("div", { className: "tmg-media-volume-container tmg-media-vb-container tmg-media-show-in-micro" }, { draggableControl: "", controlId: this.name });
    this.button = createEl("button", { className: "tmg-media-mute-btn tmg-media-vb-btn", type: "button", innerHTML: this.paths ? `<svg viewBox="0 0 25 25" class="tmg-media-volume-icon"><path d="${this.paths[0][0]}"></path></svg>` : IconRegistry.get("volumeHigh") + IconRegistry.get("volumeLow") + IconRegistry.get("volumeMuted") });
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
    this.media.on("features.volume", this.gate, { init: true, signal: this.signal });
    // Event Listeners
    this.button.addEventListener("click", this.handleClick, { signal: this.signal });
    this.el.addEventListener("mousemove", this.startActive, { signal: this.signal });
    this.el.addEventListener("mouseleave", this.stopActive, { signal: this.signal });
    // State Listeners
    this.slider.config.on("value", this.delayActive, { signal: this.signal });
    // Ctlr Media Listeners
    for (const k of ["volume", "muted"] as const) this.media.on(`state.${k}`, () => (this.syncUI(), this.syncARIA()), { init: k === "volume" && this.ctlr.flags.wired, signal: this.signal });
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

  public syncUI(): void {
    const strs = this.paths?.[this.media.state.muted || this.media.state.volume === 0 ? 2 : this.media.state.volume < 50 ? 1 : 0];
    strs && this.button.querySelectorAll("path").forEach((p, i) => strs[i] && p.setAttribute("d", strs[i]));
  }

  public syncARIA(): void {
    this.state.label = this.media.state.muted || this.media.state.volume === 0 ? "Unmute" : "Mute";
    this.state.cmd = formatActionTooltip((this.state.keyShortcut = this.settings.keys.shortcuts.mute), (this.state.voiceCommand = this.settings.voice.commands.mute));
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
