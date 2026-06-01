import { BaseComponent, ComponentState } from "@components/base";
import { addSafeClicks, createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

export type TimeConfig = undefined;

export class TimeButton extends BaseComponent<TimeConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "time";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("settings.time");
  }

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-current-time" }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Event Listeners
    addSafeClicks(this.element, this.handleClick, this.handleDblClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.currentTime", this.syncUI, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.time.mode", this.syncUI, { signal: this.signal });
    this.ctlr.config.on("settings.time.format", this.syncUI, { signal: this.signal });
    this.ctlr.config.on("settings.keys.shortcuts.timeMode", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.keys.shortcuts.timeFormat", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.toggleMode();
  }
  protected handleDblClick(): void {
    this.plug?.rotateFormat();
  }

  public syncUI(): void {
    this.el.textContent = this.plug?.toTimeText(this.media.state.currentTime, true) || "-:--";
  }
  public syncARIA(): void {
    this.state.label = `Show ${this.plug?.nextMode} time`;
    this.state.cmd = formatKeyForDisplay(this.ctlr.settings.keys.shortcuts.timeMode);
    this.el.title = `Switch (mode${this.state.cmd} / DblClick→format${formatKeyForDisplay(this.ctlr.settings.keys.shortcuts.timeFormat)})`;
    this.setBtnARIA("Switch time format");
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    time: typeof TimeButton;
  }
}
