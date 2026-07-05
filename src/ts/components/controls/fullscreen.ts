import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

export type FullscreenConfig = undefined;

export class FullscreenButton extends BaseComponent<FullscreenConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "fullscreen";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-fullscreen-btn", type: "button", innerHTML: IconRegistry.get("enterfullscreen") + IconRegistry.get("leavefullscreen") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.fullscreen", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.fullscreen", this.syncARIA, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.fullscreen", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.fullscreen = !this.media.state.fullscreen;
  }

  public syncARIA(): void {
    this.state.label = this.media.state.fullscreen ? "Exit full screen" : "Full screen";
    this.state.cmd = formatKeyForDisplay(this.settings.keys.shortcuts.fullscreen);
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    fullscreen: typeof FullscreenButton;
  }
}
