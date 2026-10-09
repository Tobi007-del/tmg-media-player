import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";
import { canMorphSVG } from "@utils/str";

export type PictureInPictureConfig = undefined;

export class PictureInPictureButton extends BaseComponent<PictureInPictureConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "pictureInPicture";
  public static readonly isControl: boolean = true;

  protected paths?: string[][] | null;

  public override create() {
    this.paths = canMorphSVG(IconRegistry.get("enterPip", true), IconRegistry.get("exitPip", true));
    return (this.element = createEl("button", { className: "tmg-media-picture-in-picture-btn", type: "button", innerHTML: this.paths ? IconRegistry.get("enterPip", true).replace('class=""', 'class="tmg-media-picture-in-picture-icon"') : IconRegistry.get("enterPip") + IconRegistry.get("exitPip") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.pictureInPicture", this.gate, { init: true, signal: this.signal });
    this.media.on("features.floatingPlayer", this.syncUI, { init: true, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("status.loadedMetadata", this.syncUI, { signal: this.signal });
    this.media.on("state.pictureInPicture", () => (this.syncUI(), this.syncARIA()), { init: this.ctlr.flags.wired, signal: this.signal });
    // ---- Config --------
    for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.pictureInPicture`, this.syncARIA, { init: p === "keys.shortcuts", signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.pictureInPicture = !this.media.state.pictureInPicture;
  }

  public syncUI(): void {
    const strs = this.paths?.[this.media.state.pictureInPicture ? 1 : 0];
    strs && this.el.querySelectorAll("path").forEach((p, i) => strs[i] && p.setAttribute("d", strs[i]));
    this[!this.media.state.pictureInPicture && !this.media.status.loadedMetadata && !this.media.features.floatingPlayer ? "disable" : "enable"]();
  }

  public syncARIA(): void {
    this.state.label = this.media.state.pictureInPicture ? "Exit picture in picture" : "Picture in picture";
    this.state.cmd = formatActionTooltip((this.state.keyShortcut = this.settings.keys.shortcuts.pictureInPicture), (this.state.voiceCommand = this.settings.voice.commands.pictureInPicture));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    pictureInPicture: typeof PictureInPictureButton;
  }
}
