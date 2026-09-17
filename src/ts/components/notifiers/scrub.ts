import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import { CtlrConfig } from "@defs/config";
import { REvent } from "sia-reactor";

export class ScrubNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "scrubNotifier";

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-scrub-notifier tmg-media-text-notifier tmg-media-top-text-notifier", innerHTML: `<span>${IconRegistry.get("tripleTriangleLeft")}</span><p class="tmg-media-scrub-notifier-text" tabindex="-1"></p><span>${IconRegistry.get("tripleTriangleRight")}</span>` }));
  }

  public override wire(): void {
    super.wire();
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.time.skip", this.handleTimeSkip, { init: true, signal: this.signal });
  }

  protected handleTimeSkip({ value }: REvent<CtlrConfig, "settings.time.skip">): void {
    this.el.querySelector("p")!.textContent = value > 0 ? `Double tap left or right to skip ${value} seconds` : "";
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    scrubNotifier: typeof ScrubNotifier;
  }
}
