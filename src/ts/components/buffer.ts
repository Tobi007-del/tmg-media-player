import { BaseComponent, ComponentState } from "./base";
import { createEl } from "@utils/dom";

export type BufferConfig = undefined;

export class Buffer extends BaseComponent<BufferConfig, ComponentState, HTMLDivElement> {
  static readonly componentName = "buffer";

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-buffer", innerHTML: `<div class="tmg-media-buffer-accent"></div><div class="tmg-media-buffer-eclipse"><div class="tmg-media-buffer-left"><div class="tmg-media-buffer-circle"></div></div><div class="tmg-media-buffer-right"><div class="tmg-media-buffer-circle"></div></div></div>` }));
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
