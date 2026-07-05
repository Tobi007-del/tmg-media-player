import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { clamp } from "@utils/num";
import { formatKeyForDisplay } from "@utils/keys";

export type Backward10Config = undefined;

export class Backward10Button extends BaseComponent<Backward10Config, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "backward10";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-backward10-btn", type: "button", innerHTML: IconRegistry.get("backward10") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    this.ctlr.config.on("settings.keys.shortcuts.backward10", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.currentTime = clamp(0, this.media.state.currentTime - 10, this.media.status.duration);
  }

  public syncARIA(): void {
    this.state.label = "Backward 10s";
    this.state.cmd = formatKeyForDisplay(this.settings.keys.shortcuts.backward10);
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    backward10: typeof Backward10Button;
  }
}
