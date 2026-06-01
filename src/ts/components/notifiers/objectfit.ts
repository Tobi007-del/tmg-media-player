import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";

export class ObjectFitNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "objectfitnotifier";
  public static readonly triggers = ["objectfitcontain", "objectfitcover", "objectfitfill"];
  public content!: HTMLDivElement;
  public containDiv!: HTMLDivElement;
  public coverDiv!: HTMLDivElement;
  public fillDiv!: HTMLDivElement;

  public override create() {
    this.content = createEl("div", { className: "tmg-media-object-fit-notifier-content" });
    this.containDiv = createEl("div", { className: "tmg-media-object-fit-contain-notifier", innerHTML: IconRegistry.get("objectfitcontain", true) });
    this.coverDiv = createEl("div", { className: "tmg-media-object-fit-cover-notifier", innerHTML: IconRegistry.get("objectfitcover", true) });
    this.fillDiv = createEl("div", { className: "tmg-media-object-fit-fill-notifier", innerHTML: IconRegistry.get("objectfitfill", true) });
    return this.bindNodes([this.content, this.containDiv, this.coverDiv, this.fillDiv]);
  }

  public override wire(): void {
    super.wire();
    // Ctlr Media Listeners
    this.media.on("state.objectFit", this.handleObjectFitState, { init: this.ctlr.payload.wired, signal: this.signal });
  }

  protected handleObjectFitState({ value }: REvent<CtlrMedia, "state.objectFit">): void {
    this.content.textContent = this.ctlr.plug("settings.objectFit")?.toLabel(value) || "";
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    objectfitnotifier: typeof ObjectFitNotifier;
  }
}
