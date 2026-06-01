import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

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
    this.media.on("features.textTracks", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.currentTextTrack", this.syncUI, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.textTracks", this.syncUI, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.captions", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.toggleVisible();
  }

  public syncUI(): void {
    this[!this.media.status.textTracks[this.media.state.currentTextTrack] ? "disable" : "enable"]();
    this.syncARIA();
  }
  public syncARIA(): void {
    this.state.label = this.plug?.getTrackKind() || "Captions";
    this.state.cmd = formatKeyForDisplay(this.ctlr.settings.keys.shortcuts.captions);
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    captions: typeof CaptionsButton;
  }
}
