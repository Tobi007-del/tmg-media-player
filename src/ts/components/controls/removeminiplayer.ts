import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";

export type RemoveMiniplayerConfig = undefined;

export class RemoveMiniplayerButton extends BaseComponent<RemoveMiniplayerConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "removeminiplayer";
  public static readonly isControl: boolean = true;
  protected get pin() {
    return this.ctlr.plug("settings.modes")?.miniplayer;
  }

  public override create(): HTMLButtonElement {
    return (this.element = createEl("button", { className: "tmg-media-miniplayer-remove-btn", type: "button", innerHTML: IconRegistry.get("removeminiplayer") }, { draggableControl: "", controlId: this.name }));
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
    this.pin?.remove();
  }

  public syncARIA(): void {
    this.state.label = "Remove miniplayer";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = "Escape"));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    removeminiplayer: typeof RemoveMiniplayerButton;
  }
}
