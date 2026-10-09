import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";
import { canMorphSVG } from "@utils/str";

export type PlayPauseConfig = undefined;

export class PlayPauseButton extends BaseComponent<PlayPauseConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "playPause";
  public static readonly isControl: boolean = true;
  protected paths?: string[][] | null;

  public override create() {
    this.paths = canMorphSVG(IconRegistry.get("play", true), IconRegistry.get("pause", true));
    return (this.element = createEl("button", { className: "tmg-media-play-pause-btn", innerHTML: this.paths ? IconRegistry.get("play", true).replace('class=""', 'class="tmg-media-play-pause-icon"') + IconRegistry.get("replay") : IconRegistry.get("play") + IconRegistry.get("pause") + IconRegistry.get("replay") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    for (const p of ["state.paused", "status.ended"] as const) this.media.on(p, () => (this.syncUI(), this.syncARIA()), { init: p === "state.paused" && this.ctlr.flags.wired, signal: this.signal });
    // ---- Config --------
    for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.playPause`, this.syncARIA, { init: p === "keys.shortcuts", signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.paused = !this.media.state.paused;
  }

  public syncUI(): void {
    const strs = this.paths?.[this.media.state.paused ? 0 : 1];
    strs && !this.media.status.ended && this.el.querySelectorAll("path").forEach((p, i) => strs[i] && p.setAttribute("d", strs[i]));
  }

  public syncARIA(): void {
    this.state.label = this.media.status.ended ? "Replay" : this.media.state.paused ? "Play" : "Pause";
    this.state.cmd = formatActionTooltip((this.state.keyShortcut = this.settings.keys.shortcuts.playPause), (this.state.voiceCommand = this.settings.voice.commands.playPause));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    playPause: typeof PlayPauseButton;
  }
}
