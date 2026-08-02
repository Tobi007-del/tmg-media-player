import { BaseComponent, ComponentState } from "@components/base";
import { addSafeClicks, createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";
import { silence } from "sia-reactor/modules";

export type TimeAndDurationConfig = undefined;

export class TimeAndDurationButton extends BaseComponent<TimeAndDurationConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "timeandduration";
  public static readonly isControl: boolean = true;
  protected time!: HTMLElement;
  protected bridge!: HTMLElement;
  protected duration!: HTMLElement;
  protected liveBadge!: HTMLElement;
  protected get plug() {
    return this.ctlr.plug("settings.time");
  }

  public override create() {
    // Variables Assignments
    this.element = createEl("button", { className: "tmg-media-time-and-duration-btn tmg-media-control-text-btn" }, { draggableControl: "", controlId: this.name });
    this.time = createEl("span", { className: "tmg-media-current-time", textContent: "-:--" });
    this.bridge = createEl("span", { className: "tmg-media-time-bridge", textContent: "/" });
    this.duration = createEl("span", { className: "tmg-media-duration-time", textContent: "-:--" });
    this.liveBadge = createEl("span", { className: "tmg-media-live-badge", textContent: "Live" });
    // DOM Injection
    return this.el.append(this.time, this.bridge, this.duration, this.liveBadge), this.element;
  }

  public override wire(): void {
    // Event Listeners
    addSafeClicks(this.element, this.handleClick, this.handleDblClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.currentTime", this.syncTime, { signal: this.signal });
    this.media.on("state.live", (e) => (this.liveBadge.classList.toggle("tmg-media-control-live", e.value), this.syncARIA()), { signal: this.signal });
    this.media.on("status.duration", this.syncDuration, { signal: this.signal });
    this.media.on("status.isLive", (e) => (this.media.container.classList.toggle("tmg-media-is-live", e.value), this.syncARIA()), { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.time.format", this.syncUI, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.time.mode", this.syncTime, { signal: this.signal });
    this.ctlr.config.on("settings.keys.shortcuts.timeMode", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.timeMode", this.syncARIA, { signal: this.signal });
    this.ctlr.config.on("settings.keys.shortcuts.timeFormat", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    !this.media.status.isLive || this.media.state.live ? this.plug?.toggleMode() : silence(() => (this.media.intent.live = true));
  }
  protected handleDblClick(): void {
    this.plug?.rotateFormat();
  }

  public syncUI(): void {
    this.bridge.textContent = { digital: "/", human: "of", "human-long": "out of" }[this.settings.time.format] || "/";
    this.syncTime(), this.syncDuration();
  }
  public syncTime(): void {
    this.time.textContent = this.plug?.toTimeText(this.media.state.currentTime, true) || "-:--";
  }
  public syncDuration(): void {
    this.duration.textContent = this.plug?.toTimeText(this.media.status.duration) || "-:--";
  }
  public syncARIA(): void {
    this.state.label = `Show ${this.plug?.nextMode} time`;
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.timeMode), (this.state.voiceCommand = this.settings.voice.commands.timeMode));
    this.el.title = !this.media.status.isLive || this.media.state.live ? `Switch (mode${this.state.cmd} / DblClick→format${formatActionForDisplay(this.settings.keys.shortcuts.timeFormat, this.settings.voice.commands.timeFormat)})` : "Skip ahead to live broadcast";
    this.setBtnARIA("Switch time format");
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    timeandduration: typeof TimeAndDurationButton;
  }
}
