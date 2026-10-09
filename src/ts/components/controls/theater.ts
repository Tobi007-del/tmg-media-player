import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";
import { canMorphSVG } from "@utils/str";

export type TheaterConfig = undefined;

export class TheaterButton extends BaseComponent<TheaterConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "theater";
  public static readonly isControl: boolean = true;
  protected paths?: string[][] | null;

  public override create() {
    this.paths = canMorphSVG(IconRegistry.get("enterTheater", true), IconRegistry.get("exitTheater", true));
    this.element = createEl("button", { className: "tmg-media-theater-btn", type: "button", innerHTML: this.paths ? IconRegistry.get("enterTheater", true).replace('class=""', 'class="tmg-media-theater-icon"') : IconRegistry.get("enterTheater") + IconRegistry.get("exitTheater") }, { draggableControl: "", controlId: this.name });
    return this.hide(), this.element;
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.theater", this.gate, { init: true, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.theater", () => (this.syncUI(), this.syncARIA()), { init: this.ctlr.flags.wired, signal: this.signal });
    for (const p of ["state.miniplayer", "status.floatingPlayer", "state.fullscreen"] as const) this.media.on(p, () => this[this.canShow ? "show" : "hide"](), { signal: this.signal });
    // ---- Config --------
    for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.theater`, this.syncARIA, { init: p === "keys.shortcuts", signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.theater = !this.media.state.theater;
  }

  public syncUI(): void {
    const strs = this.paths?.[this.media.state.theater ? 1 : 0];
    strs && this.el.querySelectorAll("path").forEach((p, i) => strs[i] && p.setAttribute("d", strs[i]));
  }

  public syncARIA(): void {
    this.state.label = this.media.state.theater ? "Default view" : "Cinema mode";
    this.state.cmd = formatActionTooltip((this.state.keyShortcut = this.settings.keys.shortcuts.theater), (this.state.voiceCommand = this.settings.voice.commands.theater));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }

  protected get canShow(): boolean {
    return !!this.media.features.theater && !this.media.state.miniplayer && !this.media.status.floatingPlayer && !this.media.state.fullscreen; // can take care of myself
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    theater: typeof TheaterButton;
  }
}
