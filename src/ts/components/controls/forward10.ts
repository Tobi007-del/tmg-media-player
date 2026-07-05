import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { clamp } from "@utils/num";
import { formatKeyForDisplay } from "@utils/keys";

export type Forward10Config = undefined;

export class Forward10Button extends BaseComponent<Forward10Config, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "forward10";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-forward10-btn", type: "button", innerHTML: IconRegistry.get("forward10") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    this.ctlr.config.on("settings.keys.shortcuts.forward10", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.currentTime = clamp(0, this.media.state.currentTime + 10, this.media.status.duration);
  }

  public syncARIA(): void {
    this.state.label = "Forward 10s";
    this.state.cmd = formatKeyForDisplay(this.settings.keys.shortcuts.forward10);
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    forward10: typeof Forward10Button;
  }
}
