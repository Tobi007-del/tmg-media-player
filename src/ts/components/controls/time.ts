import { BaseComponent, ComponentState } from "@components/base";
import { addSafeClicks, createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";

export type TimeConfig = undefined;

export class TimeButton extends BaseComponent<TimeConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "time";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("settings.time");
  }

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-time-btn tmg-media-control-text-btn", textContent: "-:--" }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Feature Gating
    this.media.on("features.live", (e) => this[e.value ? "hide" : "show"](), { init: this.ctlr.flags.wired, signal: this.signal });
    // Event Listeners
    addSafeClicks(this.element, this.handleClick, this.handleDblClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.currentTime", this.syncUI, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.time.mode", () => (this.syncUI(), this.syncARIA()), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.time.format", () => (this.syncUI(), this.syncARIA()), { signal: this.signal });
    for (const p of ["keys.shortcuts.timeMode", "voice.commands.timeMode", "keys.shortcuts.timeFormat", "voice.commands.timeFormat"] as const) this.ctlr.config.on(`settings.${p}`, this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.toggleMode();
  }
  protected handleDblClick(): void {
    this.plug?.rotateFormat();
  }

  public syncUI(): void {
    this.el.textContent = this.plug?.toTimeText(this.media.state.currentTime, true) || "";
  }
  public syncARIA(): void {
    this.state.label = `Show ${this.plug?.nextMode}`;
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.timeMode), (this.state.voiceCommand = this.settings.voice.commands.timeMode));
    this.el.title = this.state.label + this.state.cmd + ` / DblClick→ Show ${this.plug?.nextFormat} ${formatActionForDisplay(this.settings.keys.shortcuts.timeFormat, this.settings.voice.commands.timeFormat)}`;
    this.setBtnARIA("Switch time format");
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    time: typeof TimeButton;
  }
}
