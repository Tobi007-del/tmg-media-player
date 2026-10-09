import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";
import { canMorphSVG } from "@utils/str";

export type FullscreenConfig = undefined;

export class FullscreenButton extends BaseComponent<FullscreenConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "fullscreen";
  public static readonly isControl: boolean = true;
  protected paths?: string[][] | null;

  public override create() {
    this.paths = canMorphSVG(IconRegistry.get("enterFullscreen", true), IconRegistry.get("exitFullscreen", true));
    return (this.element = createEl("button", { className: "tmg-media-fullscreen-btn tmg-media-show-in-micro", type: "button", innerHTML: this.paths ? IconRegistry.get("enterFullscreen", true).replace('class=""', 'class="tmg-media-fullscreen-icon"') : IconRegistry.get("enterFullscreen") + IconRegistry.get("exitFullscreen") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.fullscreen", this.gate, { init: true, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.fullscreen", () => (this.syncUI(), this.syncARIA()), { init: this.ctlr.flags.wired, signal: this.signal });
    // ---- Config --------
    for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.fullscreen`, this.syncARIA, { init: p === "keys.shortcuts", signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.fullscreen = !this.media.state.fullscreen;
  }

  public syncUI(): void {
    const strs = this.paths?.[this.media.state.fullscreen ? 1 : 0];
    strs && this.el.querySelectorAll("path").forEach((p, i) => strs[i] && p.setAttribute("d", strs[i]));
  }

  public syncARIA(): void {
    this.state.label = this.media.state.fullscreen ? "Exit full screen" : "Full screen";
    this.state.cmd = formatActionTooltip((this.state.keyShortcut = this.settings.keys.shortcuts.fullscreen), (this.state.voiceCommand = this.settings.voice.commands.fullscreen));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    fullscreen: typeof FullscreenButton;
  }
}
