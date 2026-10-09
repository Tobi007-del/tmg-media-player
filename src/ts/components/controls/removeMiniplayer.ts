import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";

export type RemoveMiniplayerConfig = undefined;

export class RemoveMiniplayerButton extends BaseComponent<RemoveMiniplayerConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "removeMiniplayer";
  public static readonly isControl: boolean = true;
  protected get pin() {
    return this.ctlr.plug("settings.modes")?.miniplayer;
  }

  public override create(): HTMLButtonElement {
    this.element = createEl("button", { className: "tmg-media-miniplayer-remove-btn", type: "button", innerHTML: IconRegistry.get("removeMiniplayer") }, { draggableControl: "", controlId: this.name });
    return this.hide(), this.element;
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.miniplayer", this.gate, { init: true, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.miniplayer", () => this[this.canShow ? "show" : "hide"](), { init: this.ctlr.flags.wired, signal: this.signal });
    // ---- Config --------
    for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.escape`, this.syncARIA, { init: p === "keys.shortcuts", signal: this.signal });
  }

  protected handleClick(): void {
    this.pin?.remove();
  }

  public syncARIA(): void {
    this.state.label = "Remove miniplayer";
    this.state.cmd = formatActionTooltip((this.state.keyShortcut = this.settings.keys.shortcuts.escape), (this.state.voiceCommand = this.settings.voice.commands.escape));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }

  protected get canShow(): boolean {
    return this.media.state.miniplayer && !!this.media.features.miniplayer; // can take care of myself
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    removeMiniplayer: typeof RemoveMiniplayerButton;
  }
}
