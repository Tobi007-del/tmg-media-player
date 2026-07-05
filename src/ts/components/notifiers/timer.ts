import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class TimerNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "timernotifier";
  public static readonly triggers = ["timer"];

  public override create() {
    this.element = createEl("div", { className: "tmg-media-timer-notifier", innerHTML: IconRegistry.get("timer") });
    return this.bindNodes([this.element]);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    timernotifier: typeof TimerNotifier;
  }
}
