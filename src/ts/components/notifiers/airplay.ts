import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class AirPlayNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "airplayNotifier";
  public static readonly triggers = ["airplay"];

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-airplay-notifier", innerHTML: IconRegistry.get("airplay") }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    airplayNotifier: typeof AirPlayNotifier;
  }
}
