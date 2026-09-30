import { BaseNotifier, ComponentState } from "./base";

import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class PrevNextNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "prevNextNotifier";
  public static readonly triggers = ["mediaPrevious", "mediaNext"];
  public prevDiv!: HTMLDivElement;
  public nextDiv!: HTMLDivElement;

  public override create() {
    this.prevDiv = createEl("div", { className: "tmg-media-previous-notifier", innerHTML: IconRegistry.get("previous", true) });
    this.nextDiv = createEl("div", { className: "tmg-media-next-notifier", innerHTML: IconRegistry.get("next", true) });
    return this.bindNodes([this.prevDiv, this.nextDiv]);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    prevNextNotifier: typeof PrevNextNotifier;
  }
}
