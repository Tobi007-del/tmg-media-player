import { BaseComponent, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export type PiPPlaceholderConfig = undefined;

export class PiPPlaceholder extends BaseComponent<PiPPlaceholderConfig, ComponentState, HTMLDivElement> {
  public static readonly componentName = "pipplaceholder";
  protected iconButton!: HTMLButtonElement;

  public override create() {
    this.iconButton = createEl("button", { className: "tmg-media-picture-in-picture-icon-wrapper", innerHTML: IconRegistry.get("pipplaceholder") });
    return (this.element = createEl("div", { className: "tmg-media-picture-in-picture-placeholder", innerHTML: `<p>Playing in picture-in-picture</p>` }));
  }

  public override mount(): void {
    // DOM Injection
    this.el.prepend(this.iconButton), this.ctlr.DOM.controlsContainer?.prepend(this.element);
  }

  public override wire(): void {
    // Event Listeners
    this.iconButton.addEventListener("click", this.handleClick, { signal: this.signal });
  }

  protected handleClick(): void {
    this.media.intent.pictureInPicture = !this.media.state.pictureInPicture;
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    pipplaceholder: typeof PiPPlaceholder;
  }
}
