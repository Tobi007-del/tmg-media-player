import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";
import { canMorphSVG } from "@utils/str";

export type ObjectFit = undefined;

export class ObjectFitButton extends BaseComponent<ObjectFit, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "objectFit";
  public static readonly isControl: boolean = true;
  protected paths?: string[][] | null;
  protected get plug() {
    return this.ctlr.plug("settings.objectFit");
  }

  public override create() {
    this.paths = canMorphSVG(IconRegistry.get("objectFitContain", true), IconRegistry.get("objectFitCover", true), IconRegistry.get("objectFitFill", true));
    return (this.element = createEl("button", { className: "tmg-media-object-fit-btn", type: "button", innerHTML: this.paths ? IconRegistry.get("objectFitCover", true).replace('class=""', 'class="tmg-media-object-fit-icon"') : IconRegistry.get("objectFitContain") + IconRegistry.get("objectFitCover") + IconRegistry.get("objectFitFill") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.objectFit", this.gate, { init: true, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.objectFit", () => (this.syncUI(), this.syncARIA()), { init: this.ctlr.flags.wired, signal: this.signal });
    // ---- Config --------
    for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.objectFit`, this.syncARIA, { init: p === "keys.shortcuts", signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.rotateFit();
  }

  public syncUI(): void {
    const els = this.el.querySelectorAll("path"),
      strs = this.paths?.[this.media.state.objectFit === "fill" ? 2 : this.media.state.objectFit === "cover" ? 1 : 0];
    strs && (els.forEach((p, i) => strs[i] && p.setAttribute("d", strs[i])), els[0]?.setAttribute("stroke-width", this.media.state.objectFit === "fill" ? "1.5" : "2.25"));
  }

  public syncARIA(): void {
    this.state.label = this.plug?.toLabel(this.plug?.nextFit) || "";
    this.state.cmd = formatActionTooltip((this.state.keyShortcut = this.settings.keys.shortcuts.objectFit), (this.state.voiceCommand = this.settings.voice.commands.objectFit));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    objectFit: typeof ObjectFitButton;
  }
}
