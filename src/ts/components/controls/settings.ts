import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

export type SettingsConfig = undefined;

export class SettingsButton extends BaseComponent<SettingsConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "settings";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("settings.settingsView");
  }

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-settings-btn", type: "button", innerHTML: IconRegistry.get("settings") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.shortcuts.settings", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    const menu = this.plug?.menu;
    menu ? menu.toggle(this.el) : this.plug?.toggleView();
  }

  public syncARIA(): void {
    this.state.label = "Settings";
    this.state.cmd = formatKeyForDisplay(this.settings.keys.shortcuts.settings);
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    settings: typeof SettingsButton;
  }
}
