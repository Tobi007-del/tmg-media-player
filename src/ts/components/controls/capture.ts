import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { addSafeClicks, createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

export type CaptureConfig = undefined;

export class CaptureButton extends BaseComponent<CaptureConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "capture";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("settings.frame");
  }

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-capture-btn", type: "button", innerHTML: IconRegistry.get("capture") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.frameCapture", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    addSafeClicks(this.el, this.handleClick, this.handleDblClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.shortcuts.capture", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.capture();
  }
  protected handleDblClick(): void {
    this.plug?.capture("monochrome");
  }

  public syncARIA(): void {
    this.state.label = "Capture frame";
    this.state.cmd = formatKeyForDisplay(this.settings.keys.shortcuts.capture);
    this.el.title = `Capture${this.state.cmd} ? DblClick?B&W (+alt)`;
    this.setBtnARIA("Capture monochrome frame");
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    capture: typeof CaptureButton;
  }
}
