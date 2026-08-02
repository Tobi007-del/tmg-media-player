import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";

export type BigPreviousConfig = undefined;

export class BigPreviousButton extends BaseComponent<BigPreviousConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "bigprevious";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("playlist");
  }

  public override create() {
    this.element = createEl("button", { className: "tmg-media-big-previous-btn", type: "button", innerHTML: IconRegistry.get("previous") }, { draggableControl: "", dragId: "big", controlId: this.name });
    return this.disable(), this.element;
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.previousItem", ({ value }) => this[value ? "enable" : "disable"](), { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("playlist", this.syncUI, { signal: this.signal, init: true, depth: 1 });
    this.ctlr.config.on("settings.keys.shortcuts.previous", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.previous", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.previous();
  }

  public syncUI(): void {
    this[this.ctlr.config.playlist.content && this.ctlr.config.playlist.content.length > 1 ? "show" : "hide"]();
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
    bigprevious: typeof BigPreviousButton;
  }
}
