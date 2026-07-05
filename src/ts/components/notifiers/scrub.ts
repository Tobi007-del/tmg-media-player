import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class ScrubNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "scrubnotifier";

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-scrub-notifier tmg-media-text-notifier tmg-media-top-text-notifier", innerHTML: `<span>${IconRegistry.get("tripletriangleleft")}</span><p class="tmg-media-scrub-notifier-text" tabindex="-1">Double tap left or right to skip</p><span>${IconRegistry.get("tripletriangleright")}</span>` }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    scrubnotifier: typeof ScrubNotifier;
  }
}
