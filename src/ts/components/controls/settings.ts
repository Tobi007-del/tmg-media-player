import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { addSafeClicks, createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";
import type { UITuple } from "@defs/UIOptions";

export type SettingsConfig = undefined;

export class SettingsButton extends BaseComponent<SettingsConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "settings";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("settings.panel");
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
    for (const p of ["state.currentLevel", "state.autoLevel", "status.levels", "status.loadedMetadata"] as const) this.media.on(p, this.syncBadge, { init: p === "status.levels", signal: this.signal });
    // ---- Config --------
    for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.settings`, this.syncARIA, { init: p === "keys.shortcuts", signal: this.signal });
  }

  protected handleClick(): void {
    this.menu ? this.menu.toggle(this.el, false) : this.plug?.toggleMore();
  }
  protected handleDblClick(): void {
    this.menu ? this.menu.toggle(this.el, true) : this.plug?.toggleMore();
  }

  protected syncBadge(): void {
    const item = this.menu?.getItem("quality");
    if (!item) return this.setBadge("");
    const options = item.getOptions?.() as UITuple<number>[];
    this.setBadge((this.media.state.autoLevel ? options?.at(-1) : options?.find((o) => o.value === this.media.state.currentLevel))?.badge || "");
  }

  public syncARIA(): void {
    this.state.label = "Settings";
    this.state.cmd = formatActionTooltip((this.state.keyShortcut = this.settings.keys.shortcuts.settings), (this.state.voiceCommand = this.settings.voice.commands.settings));
    this.el.title = this.state.label + this.state.cmd + ` ↔ Double click→ with history`;
    this.setBtnARIA("Open last history");
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    settings: typeof SettingsButton;
  }
}
