import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";

export type CastConfig = undefined;

export class CastButton extends BaseComponent<CastConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "cast";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-cast-btn", type: "button", innerHTML: IconRegistry.get("cast") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.cast", this.gate, { init: true, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.cast", this.syncARIA, { signal: this.signal });
    // ---- Config --------
    for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.cast`, this.syncARIA, { init: p === "keys.shortcuts", signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.cast = !this.media.state.cast;
  }

  public syncARIA(): void {
    this.state.label = this.media.state.cast ? "Stop casting" : "Cast to TV";
    this.state.cmd = formatActionTooltip((this.state.keyShortcut = this.settings.keys.shortcuts.cast), (this.state.voiceCommand = this.settings.voice.commands.cast));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    cast: typeof CastButton;
  }
}
