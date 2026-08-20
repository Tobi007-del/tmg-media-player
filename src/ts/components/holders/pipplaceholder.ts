import { BaseComponent, ComponentState } from "../base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import { formatActionForDisplay } from "../../super/utils";

export type PiPPlaceholderConfig = undefined;

export class PiPPlaceholder extends BaseComponent<PiPPlaceholderConfig, ComponentState, HTMLDivElement> {
  public static readonly componentName = "pipPlaceholder";
  protected iconBtn!: HTMLButtonElement;

  public override create() {
    this.element = createEl("div", { className: "tmg-media-placeholder tmg-media-picture-in-picture-placeholder", innerHTML: `<p>Playing in picture-in-picture</p>` });
    this.iconBtn = createEl("button", { className: "tmg-media-placeholder-icon-btn tmg-media-picture-in-picture-icon-btn", innerHTML: IconRegistry.get("pipPlaceholder") });
    return this.el.prepend(this.iconBtn), this.el;
  }

  public override mount(): void {
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.el);
  }

  public override wire(): void {
    // Event Listeners
    this.iconBtn.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.shortcuts.pictureInPicture", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.pictureInPicture", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.pictureInPicture = !this.media.state.pictureInPicture;
  }

  public syncARIA(): void {
    this.state.label = this.media.state.pictureInPicture ? "Exit picture in picture" : "Picture in picture";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.pictureInPicture), (this.state.voiceCommand = this.settings.voice.commands.pictureInPicture));
    this.iconBtn.title = this.state.label + this.state.cmd;
    this.setBtnARIA("", this.iconBtn);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    pipPlaceholder: typeof PiPPlaceholder;
  }
}
