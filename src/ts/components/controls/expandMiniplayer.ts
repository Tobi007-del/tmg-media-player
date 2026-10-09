import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";

export type ExpandMiniplayerConfig = undefined;

export class ExpandMiniplayerButton extends BaseComponent<ExpandMiniplayerConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "expandMiniplayer";
  public static readonly isControl: boolean = true;
  protected get pin() {
    return this.ctlr.plug("settings.modes")?.miniplayer;
  }

  public override create(): HTMLButtonElement {
    this.element = createEl("button", { className: "tmg-media-miniplayer-expand-btn tmg-media-show-in-micro", type: "button", innerHTML: IconRegistry.get("expandMiniplayer") }, { draggableControl: "", controlId: this.name });
    return this.hide(), this.element;
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.miniplayer", this.gate, { init: true, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.miniplayer", () => this[this.canShow ? "show" : "hide"](), { init: this.ctlr.flags.wired, signal: this.signal });
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

  protected get canShow(): boolean {
    return this.media.state.miniplayer && !!this.media.features.miniplayer; // can take care of myself
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    expandMiniplayer: typeof ExpandMiniplayerButton;
  }
}
