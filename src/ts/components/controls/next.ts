import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

export type NextConfig = undefined;

export class NextButton extends BaseComponent<NextConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "next";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("playlist");
  }

  public override create() {
    this.element = createEl("button", { className: "tmg-media-next-btn", type: "button", innerHTML: IconRegistry.get("next") }, { draggableControl: "", controlId: this.name });
    return this.hide(), this.element;
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Plug Listeners
    this.plug?.state.on("currentIndex", () => this[this.plug!.atLast ? "hide" : "show"](), { init: true, signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.shortcuts.next", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.next();
  }

  public syncARIA(): void {
    this.state.label = "Next";
    this.state.cmd = formatKeyForDisplay(this.ctlr.settings.keys.shortcuts.next);
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    next: typeof NextButton;
  }
}
