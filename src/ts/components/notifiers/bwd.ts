import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class BwdNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "bwdnotifier";
  public static readonly triggers = ["bwd"];

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-bwd-notifier", innerHTML: IconRegistry.get("bwd") }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    bwdnotifier: typeof BwdNotifier;
  }
}
