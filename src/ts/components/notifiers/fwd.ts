import { BaseNotifier, ComponentState } from "./base";

import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class FwdNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "fwdnotifier";
  public static readonly triggers = ["fwd"];

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-fwd-notifier", innerHTML: IconRegistry.get("fwd") }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    fwdnotifier: typeof FwdNotifier;
  }
}
