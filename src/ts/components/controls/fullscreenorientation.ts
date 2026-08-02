import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";

export type FullscreenOrientationConfig = undefined;

export class FullscreenOrientationButton extends BaseComponent<FullscreenOrientationConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "fullscreenorientation";
  public static readonly isControl: boolean = true;
  protected get pin() {
    return this.ctlr.plug("settings.modes")?.fullscreen;
  }

  public override create() {
    this.element = createEl("button", { className: "tmg-media-fullscreen-orientation-btn", type: "button", innerHTML: IconRegistry.get("fullscreenorientation") }, { draggableControl: "", controlId: this.name });
    return this.hide(), this.element;
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.fullscreen", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("features.fullscreenOrientation", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.fullscreen", () => this[this.canShow ? "show" : "hide"](), { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    this.syncARIA();
  }

  protected handleClick(): void {
    this.media.intent.fullscreenOrientation = (this.media.state.fullscreenOrientation || this.ctlr.state.screenOrientation.type).startsWith("portrait") ? "landscape-primary" : "portrait-primary";
  }

  public syncARIA(): void {
    this.el.title = this.state.label = "Change fullscreen orientation";
    this.setBtnARIA();
  }

  protected override get canShow(): boolean {
    return !!this.media.features.fullscreen && !!this.media.features.fullscreenOrientation; // this.media.state.fullscreen &&
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    fullscreenorientation: typeof FullscreenOrientationButton;
  }
}
