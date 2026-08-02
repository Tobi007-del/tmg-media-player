import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";

export type PrevConfig = undefined;

export class PreviousButton extends BaseComponent<PrevConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "previous";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("playlist");
  }

  public override create() {
    this.element = createEl("button", { className: "tmg-media-previous-btn", type: "button", innerHTML: IconRegistry.get("previous") }, { draggableControl: "", controlId: this.name });
    return this.hide(), this.element;
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.previousItem", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.shortcuts.previous", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.previous", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.previous();
  }

  public syncARIA(): void {
    this.state.label = "Previous";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.previous), (this.state.voiceCommand = this.settings.voice.commands.previous));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    previous: typeof PreviousButton;
  }
}
