import { BaseNotifier, ComponentState } from "./base";

import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class PrevNextNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "prevnextnotifier";
  public static readonly triggers = ["mediaprev", "medianext"];

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-prevnext-notifier", innerHTML: IconRegistry.get("prev") + IconRegistry.get("next") }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    prevnextnotifier: typeof PrevNextNotifier;
  }
}
