import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";

export type PlayPauseConfig = undefined;

export class PlayPauseButton extends BaseComponent<PlayPauseConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "playpause";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-play-pause-btn", innerHTML: IconRegistry.get("play") + IconRegistry.get("pause") + IconRegistry.get("replay") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.paused", this.syncARIA, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.ended", this.syncARIA, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.playPause", this.syncARIA, { signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.playPause", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.paused = !this.media.state.paused;
  }

  public syncARIA(): void {
    this.state.label = this.media.status.ended ? "Replay" : this.media.state.paused ? "Play" : "Pause";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.playPause), (this.state.voiceCommand = this.settings.voice.commands.playPause));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    playPause: typeof PlayPauseButton;
  }
}
