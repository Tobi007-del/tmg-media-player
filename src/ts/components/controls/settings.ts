import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { addSafeClicks, createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";
import type { UITuple } from "@defs/UIOptions";

export type SettingsConfig = undefined;

export class SettingsButton extends BaseComponent<SettingsConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "settings";
  public static readonly isControl: boolean = true;

  protected get plug() {
    return this.ctlr.plug("settings.settingsView");
  }
  protected get menu() {
    return this.plug?.menu;
  }

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-settings-btn", type: "button", innerHTML: IconRegistry.get("settings") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Event Listeners
    addSafeClicks(this.element, this.handleClick, this.handleDblClick, { signal: this.signal });
    // Ctlr Media Listeners
    for (const path of ["state.currentLevel", "state.autoLevel", "status.levels"] as const) this.ctlr.media.on(path, this.syncBadge, { init: true, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.settings", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.settings", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.menu ? this.menu.toggle(this.el, false) : this.plug?.toggleView();
  }
  protected handleDblClick(): void {
    this.menu ? this.menu.toggle(this.el, true) : this.plug?.toggleView();
  }

  protected syncBadge(): void {
    const item = this.menu?.getItem("quality");
    if (!item) return void this.setBadge("");
    const options = item.getOptions?.() as UITuple<number>[];
    this.setBadge((this.ctlr.media.state.autoLevel ? options?.at(-1) : options?.find((o) => o.value === this.ctlr.media.state.currentLevel))?.badge || "");
  }

  public syncARIA(): void {
    this.state.label = "Settings";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.settings), (this.state.voiceCommand = this.settings.voice.commands.settings));
    this.el.title = `Settings (open${this.state.cmd} / DblClick→last history)`;
    this.setBtnARIA("Open last history");
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    settings: typeof SettingsButton;
  }
}
