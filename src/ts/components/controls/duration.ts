import { BaseComponent, ComponentState } from "@components/base";
import { createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";
import { silence } from "sia-reactor/modules";

export type DurationConfig = undefined;

export class DurationButton extends BaseComponent<DurationConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "duration";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("settings.time");
  }

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-duration-btn tmg-media-control-text-btn", textContent: "-:--" }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("status.duration", this.syncUI, { signal: this.signal });
    this.media.on("state.live", (e) => (this.el.classList.toggle("tmg-media-control-live", e.value), this.el.classList.toggle("tmg-media-live-badge", e.value), this.syncARIA()), { signal: this.signal });
    this.media.on("status.isLive", (e) => (this.media.container.classList.toggle("tmg-media-is-live", e.value), this.syncARIA()), { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.time.format", this.syncUI, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.keys.shortcuts.timeFormat", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.timeFormat", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    !this.media.status.isLive || this.media.state.live ? this.plug?.rotateFormat() : silence(() => (this.media.intent.live = true));
  }

  public syncUI(): void {
    this.el.textContent = !this.media.status.isLive ? this.plug?.toTimeText(this.media.status.duration) || "-:--" : "Live";
  }
  public syncARIA(): void {
    this.state.label = "Switch time format";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.timeFormat), (this.state.voiceCommand = this.settings.voice.commands.timeFormat));
    this.el.title = !this.media.status.isLive || this.media.state.live ? this.state.label + this.state.cmd : "Skip ahead to live broadcast";
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    duration: typeof DurationButton;
  }
}
