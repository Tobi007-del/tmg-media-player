import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class CaptionsNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "captionsNotifier";
  public static readonly triggers = ["captions"];

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-captions-notifier", innerHTML: IconRegistry.get("subtitles") + IconRegistry.get("captions") }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    captionsNotifier: typeof CaptionsNotifier;
  }
}
