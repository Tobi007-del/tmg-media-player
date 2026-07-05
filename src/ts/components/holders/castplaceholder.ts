import { BaseComponent, ComponentState } from "../base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import { formatKeyForDisplay } from "@utils/keys";

export type CastPlaceholderConfig = undefined;

export class CastPlaceholder extends BaseComponent<CastPlaceholderConfig, ComponentState, HTMLDivElement> {
  public static readonly componentName = "castplaceholder";
  protected iconBtn!: HTMLButtonElement;

  public override create() {
    this.element = createEl("div", { className: "tmg-media-placeholder tmg-media-cast-placeholder", innerHTML: `<p>Casting to External Display</p>` });
    this.iconBtn = createEl("button", { className: "tmg-media-placeholder-icon-btn tmg-media-cast-icon-btn", innerHTML: IconRegistry.get("castplaceholder") });
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
    this.ctlr.config.on("settings.keys.shortcuts.cast", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.cast = !this.media.state.cast;
  }

  public syncARIA(): void {
    this.state.label = this.media.state.cast ? "Stop casting" : "Cast to Display";
    this.state.cmd = formatKeyForDisplay(this.settings.keys.shortcuts.cast);
    this.iconBtn.title = this.state.label + this.state.cmd;
    this.setBtnARIA("", this.iconBtn);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    castplaceholder: typeof CastPlaceholder;
  }
}
