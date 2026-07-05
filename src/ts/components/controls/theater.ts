import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

export type TheaterConfig = undefined;

export class TheaterButton extends BaseComponent<TheaterConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "theater";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-theater-btn", type: "button", innerHTML: IconRegistry.get("entertheater") + IconRegistry.get("leavetheater") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.theater", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.theater", this.syncARIA, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.theater", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.theater = !this.media.state.theater;
  }

  public syncARIA(): void {
    this.state.label = this.media.state.theater ? "Default view" : "Cinema mode";
    this.state.cmd = formatKeyForDisplay(this.settings.keys.shortcuts.theater);
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    theater: typeof TheaterButton;
  }
}
