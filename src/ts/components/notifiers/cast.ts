import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class CastNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "castNotifier";
  public static readonly triggers = ["cast"];

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-cast-notifier", innerHTML: IconRegistry.get("cast") }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    castNotifier: typeof CastNotifier;
  }
}
