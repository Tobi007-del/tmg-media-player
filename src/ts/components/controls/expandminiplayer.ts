import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";

export type ExpandMiniplayerConfig = undefined;

export class ExpandMiniplayerButton extends BaseComponent<ExpandMiniplayerConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "expandminiplayer";
  public static readonly isControl: boolean = true;
  protected get pin() {
    return this.ctlr.plug("settings.modes")?.miniplayer;
  }

  public override create(): HTMLButtonElement {
    return (this.element = createEl("button", { className: "tmg-media-miniplayer-expand-btn", type: "button", innerHTML: IconRegistry.get("expandminiplayer") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.miniplayer", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Post Wiring
    this.syncARIA();
  }

  protected handleClick(): void {
    this.pin?.expand();
  }

  public syncARIA(): void {
    this.el.title = this.state.label = "Expand miniplayer";
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    expandminiplayer: typeof ExpandMiniplayerButton;
  }
}
