import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

export type BigPrevConfig = undefined;

export class BigPrevButton extends BaseComponent<BigPrevConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "bigprev";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("playlist");
  }

  public override create() {
    this.element = createEl("button", { className: "tmg-media-big-prev-btn", type: "button", innerHTML: IconRegistry.get("prev") }, { draggableControl: "", dragId: "big", controlId: this.name });
    return this.disable(), this.element;
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.shortcuts.prev", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("playlist", this.syncUI, { signal: this.signal, init: true, depth: 1 });
  }

  protected handleClick(): void {
    this.plug?.previous();
  }

  public syncUI(): void {
    this[this.ctlr.config.playlist && this.ctlr.config.playlist.length > 1 ? "enable" : "disable"](), this[this.plug?.atFirst ?? true ? "disable" : "enable"]();
  }
  public syncARIA(): void {
    this.state.label = "Previous";
    this.state.cmd = formatKeyForDisplay(this.ctlr.settings.keys.shortcuts.prev);
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    bigprev: typeof BigPrevButton;
  }
}
