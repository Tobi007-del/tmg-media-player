import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

export type BigNextConfig = undefined;

export class BigNextButton extends BaseComponent<BigNextConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "bignext";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("playlist");
  }

  public override create() {
    this.element = createEl("button", { className: "tmg-media-big-next-btn", type: "button", innerHTML: IconRegistry.get("next") }, { draggableControl: "", dragId: "big", controlId: this.name });
    return this.disable(), this.element;
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.shortcuts.next", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("playlist", this.syncUI, { signal: this.signal, init: true, depth: 1 });
  }

  protected handleClick(): void {
    this.plug?.next();
  }

  public syncUI(): void {
    this[this.ctlr.config.playlist && this.ctlr.config.playlist.length > 1 ? "enable" : "disable"](), this[this.plug?.atLast ?? true ? "disable" : "enable"]();
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
    bignext: typeof BigNextButton;
  }
}
