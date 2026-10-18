import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { formatActionTooltip } from "@utils/keys";

export type BackwardConfig = undefined;

export class BackwardButton extends BaseComponent<BackwardConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName = "backward";
  public static readonly isControl: boolean = true;

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-backward-btn", type: "button", innerHTML: IconRegistry.get("backward") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.time.skip", () => (this.syncUI(), this.syncARIA()), { init: true, signal: this.signal });
    for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.timeSkipBwd`, this.syncARIA, { init: p === "keys.shortcuts", signal: this.signal });
  }

  protected handleClick(): void {
    this.ctlr.plug("settings.time")?.skipBwd();
  }

  public syncUI(): void {
    const textEl = this.el.querySelector("text");
    if (textEl) textEl.textContent = String(this.settings.time.skip);
  }

  public syncARIA(): void {
    this.state.label = `Backward ${this.settings.time.skip} seconds`;
    this.state.cmd = formatActionTooltip(this.settings, (this.state.cmdKey = "timeSkipBwd"));
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    backward: typeof BackwardButton;
  }
}
