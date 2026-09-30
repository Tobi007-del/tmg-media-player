import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";

export class CancelScrubNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "cancelScrubNotifier";

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-cancel-scrub-notifier tmg-media-text-notifier tmg-media-top-text-notifier", innerHTML: "Release to cancel" }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    cancelScrubNotifier: typeof CancelScrubNotifier;
  }
}
