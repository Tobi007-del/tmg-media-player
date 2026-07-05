import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";

export class TouchTimelineNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "touchtimelinenotifier";

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-touch-timeline-notifier tmg-media-text-notifier", innerHTML: "Current Time" }));
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    touchtimelinenotifier: typeof TouchTimelineNotifier;
  }
}

export default TouchTimelineNotifier;
