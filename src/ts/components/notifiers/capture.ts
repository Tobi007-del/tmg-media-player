import { BaseNotifier, ComponentState } from "./base";

import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class CaptureNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "capturenotifier";
  public static readonly triggers = ["capture"];

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-capture-notifier", innerHTML: IconRegistry.get("capture") }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    capturenotifier: typeof CaptureNotifier;
  }
}
