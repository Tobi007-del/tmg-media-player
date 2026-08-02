import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";

export type Forward10Config = undefined;

export class Forward10Button extends BaseComponent<Forward10Config, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "forward10";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-forward10-btn", type: "button", innerHTML: IconRegistry.get("forward10") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Post Wiring
    this.syncARIA();
  }

  protected handleClick(): void {
    this.media.intent.currentTime += 10;
  }

  public syncARIA(): void {
    this.state.label = "Forward 10 seconds";
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    forward10: typeof Forward10Button;
  }
}
