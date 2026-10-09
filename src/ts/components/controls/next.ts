import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";

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
    this.media.on("features.nextItem", this.gate, { init: true, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Config Listeners
    for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.next`, this.syncARIA, { init: p === "keys.shortcuts", signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.next();
  }

  public syncARIA(): void {
    this.state.label = "Next";
    this.state.cmd = formatActionTooltip((this.state.keyShortcut = this.settings.keys.shortcuts.next), (this.state.voiceCommand = this.settings.voice.commands.next));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    next: typeof NextButton;
  }
}
