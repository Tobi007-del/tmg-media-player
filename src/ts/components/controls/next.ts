import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";

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
    // Features Gating
    this.media.on("features.nextItem", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.shortcuts.next", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.next", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.next();
  }

  public syncARIA(): void {
    this.state.label = "Next";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.next), (this.state.voiceCommand = this.settings.voice.commands.next));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    next: typeof NextButton;
  }
}
