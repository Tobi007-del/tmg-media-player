import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";

export type Backward10Config = undefined;

export class Backward10Button extends BaseComponent<Backward10Config, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "backward10";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-backward10-btn", type: "button", innerHTML: IconRegistry.get("backward10") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Post Wiring
    this.syncARIA();
  }

  protected handleClick(): void {
    this.media.intent.currentTime -= 10;
  }

  public syncARIA(): void {
    this.state.label = "Backward 10 seconds";
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    backward10: typeof Backward10Button;
  }
}
