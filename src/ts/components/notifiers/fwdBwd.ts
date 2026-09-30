import { BaseNotifier, ComponentState } from "./base";

import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class FwdBwdNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "fwdBwdNotifier";
  public static readonly triggers = ["fwd", "bwd"];
  public fwdDiv!: HTMLDivElement;
  public bwdDiv!: HTMLDivElement;

  public override create() {
    this.fwdDiv = createEl("div", { className: "tmg-media-fwd-notifier", innerHTML: IconRegistry.get("fwd") });
    this.bwdDiv = createEl("div", { className: "tmg-media-bwd-notifier", innerHTML: IconRegistry.get("bwd") });
    return this.bindNodes([this.fwdDiv, this.bwdDiv]);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    fwdBwdNotifier: typeof FwdBwdNotifier;
  }
}
