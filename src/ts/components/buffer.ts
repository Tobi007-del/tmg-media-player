import { BaseComponent, ComponentState } from "./base";
import { createEl } from "@utils/dom";

export type BufferConfig = undefined;

export class Buffer extends BaseComponent<BufferConfig, ComponentState, HTMLDivElement> {
  static readonly componentName = "buffer";

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-buffer tmg-media-no-pointer", innerHTML: `<div class="tmg-media-buffer-accent tmg-media-fill"></div><div class="tmg-media-buffer-eclipse tmg-media-fill"><div class="tmg-media-buffer-left tmg-media-cover"><div class="tmg-media-buffer-circle"></div></div><div class="tmg-media-buffer-right tmg-media-cover"><div class="tmg-media-buffer-circle"></div></div></div>` }));
  }

  public override mount(): void {
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.element);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    buffer: typeof Buffer;
  }
}
