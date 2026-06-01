import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class PlayPauseNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "playpausenotifier";
  public static readonly triggers = ["mediaplay", "mediapause"];

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-play-notifier", innerHTML: IconRegistry.get("play") + IconRegistry.get("pause") }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    playpausenotifier: typeof PlayPauseNotifier;
  }
}
