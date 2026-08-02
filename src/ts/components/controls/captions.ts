import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";
import { capitalize } from "@utils/str";

export type CaptionsConfig = undefined;

export class CaptionsButton extends BaseComponent<CaptionsConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "captions";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("settings.captions");
  }

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-captions-btn", type: "button", innerHTML: IconRegistry.get("subtitles") + IconRegistry.get("captions") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.textVisible", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Plug Listeners
    this.plug?.state.on("secondaryTracks", this.syncBadge, { signal: this.signal });
    // Ctlr Media Listeners
    for (const p of ["state.currentTextTrack", "status.textTracks", "state.textVisible"] as const) this.media.on(p, this.syncUI, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.captions", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.captions", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.toggleVisible();
  }

  public syncUI(): void {
    this[!this.plug?.canVisible ? "disable" : "enable"](), this.syncBadge(), this.syncARIA();
  }
  protected syncBadge(): void {
    const track = this.media.status.textTracks[this.media.state.currentTextTrack],
      c = this.plug?.config.multiple && this.plug.state.secondaryTracks.length;
    this.setBadge(track && this.media.state.textVisible ? `${((track.label || track.language)?.slice(0, 2) || "").toUpperCase()}${c ? `+${c}` : ""}` : "");
  }

  public syncARIA(): void {
    this.state.label = capitalize(this.plug?.getTrackKind()) || "Captions";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.captions), (this.state.voiceCommand = this.settings.voice.commands.captions));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    captions: typeof CaptionsButton;
  }
}
