import { BaseComponent, ComponentState } from "../base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import { formatActionForDisplay } from "@utils/keys";

export type ErrorPlaceholderConfig = undefined;

export class ErrorPlaceholder extends BaseComponent<ErrorPlaceholderConfig, ComponentState, HTMLDivElement> {
  public static readonly componentName = "errorPlaceholder";
  protected iconBtn!: HTMLButtonElement;
  protected get plug() {
    return this.ctlr.plug("settings.errors");
  }

  public override create() {
    this.element = createEl("div", { className: "tmg-media-placeholder tmg-media-error-placeholder", innerHTML: `<p></p>` });
    this.iconBtn = createEl("button", { className: "tmg-media-placeholder-icon-btn tmg-media-error-icon-btn", innerHTML: IconRegistry.get("errorPlaceholder") });
    return this.el.prepend(this.iconBtn), this.el;
  }

  public override mount(): void {
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.el);
  }

  public override wire(): void {
    // Event Listeners
    this.iconBtn.addEventListener("click", this.handleClick, { signal: this.signal });
    // Plug Listeners
    this.plug?.state.on("message", this.syncUI, { init: true, signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.shortcuts.reload", this.syncARIA, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.reload", this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.reloadTech();
  }

  protected syncUI(): void {
    this.el.querySelector("p")!.innerHTML = `${this.plug?.state.message || ""}`;
    this.el.dataset.code = `${this.plug?.state.code || ""}`;
  }
  public syncARIA(): void {
    this.state.label = "Reload player";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts.reload), (this.state.voiceCommand = this.settings.voice.commands.reload));
    this.iconBtn.title = this.state.label + this.state.cmd;
    this.setBtnARIA("", this.iconBtn);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    errorPlaceholder: typeof ErrorPlaceholder;
  }
}
