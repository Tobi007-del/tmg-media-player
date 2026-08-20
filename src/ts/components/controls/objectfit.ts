import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";

export type ObjectFit = undefined;

export class ObjectFitButton extends BaseComponent<ObjectFit, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "objectFit";
  public static readonly isControl: boolean = true;

  protected get plug() {
    return this.ctlr.plug("settings.objectFit");
  }

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-object-fit-btn", type: "button", innerHTML: IconRegistry.get("objectFitContain") + IconRegistry.get("objectFitCover") + IconRegistry.get("objectFitFill") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.objectFit", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.objectFit", this.syncARIA, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.shortcuts.objectFit", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.objectFit", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.rotateFit();
  }

  public syncARIA(): void {
    this.state.label = this.plug?.toLabel(this.plug?.nextFit) || "";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.objectFit), (this.state.voiceCommand = this.settings.voice.commands.objectFit));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    objectFit: typeof ObjectFitButton;
  }
}
