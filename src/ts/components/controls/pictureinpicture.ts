import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";

export type PictureInPictureConfig = undefined;

export class PictureInPictureButton extends BaseComponent<PictureInPictureConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "pictureInPicture";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-picture-in-picture-btn", type: "button", innerHTML: IconRegistry.get("enterPip") + IconRegistry.get("leavePip") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.pictureInPicture", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.pictureInPicture", this.syncARIA, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.pictureInPicture", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.pictureInPicture", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.pictureInPicture = !this.media.state.pictureInPicture;
  }

  public syncARIA(): void {
    this.state.label = this.media.state.pictureInPicture ? "Exit picture in picture" : "Picture in picture";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.pictureInPicture), (this.state.voiceCommand = this.settings.voice.commands.pictureInPicture));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    pictureInPicture: typeof PictureInPictureButton;
  }
}
