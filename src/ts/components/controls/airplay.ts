import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

export type AirPlayConfig = undefined;

export class AirPlayButton extends BaseComponent<AirPlayConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "airplay";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-airplay-btn", type: "button", innerHTML: IconRegistry.get("airplay") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.airplay", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.airplay", this.syncARIA, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.airplay", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    if (!this.media.state.airplay) this.media.intent.airplay = true; // AirPlay handles its own connect/disconnect UI natively, we just trigger it
  }

  public syncARIA(): void {
    this.state.label = this.media.state.airplay ? "AirPlay Active" : "AirPlay";
    this.state.cmd = formatKeyForDisplay(this.settings.keys.shortcuts.airplay);
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    airplay: typeof AirPlayButton;
  }
}
