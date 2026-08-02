import { BaseComponent, ComponentState } from "../base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import { formatActionForDisplay } from "@utils/keys";

export type AirPlayPlaceholderConfig = undefined;

export class AirPlayPlaceholder extends BaseComponent<AirPlayPlaceholderConfig, ComponentState, HTMLDivElement> {
  public static readonly componentName = "airplayplaceholder";
  protected iconBtn!: HTMLButtonElement;

  public override create() {
    this.element = createEl("div", { className: "tmg-media-placeholder tmg-media-airplay-placeholder", innerHTML: `<p>Streaming to AirPlay Display</p>` });
    this.iconBtn = createEl("button", { className: "tmg-media-placeholder-icon-btn tmg-media-airplay-icon-btn", innerHTML: IconRegistry.get("airplayplaceholder") });
    return this.el.prepend(this.iconBtn), this.el;
  }

  public override mount(): void {
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.el);
  }

  public override wire(): void {
    // Event Listeners
    this.iconBtn.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.shortcuts.airplay", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.airplay = !this.media.state.airplay;
  }

  public syncARIA(): void {
    this.state.label = this.media.state.airplay ? "Stop airplaying" : "AirPlay to Display";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.airplay));
    this.iconBtn.title = this.state.label + this.state.cmd;
    this.setBtnARIA("", this.iconBtn);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    airplayplaceholder: typeof AirPlayPlaceholder;
  }
}
