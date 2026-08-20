import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { VolumePlug, VolumeState } from "@plugs/settings/volume";

export class VolumeNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "volumeNotifier";
  public static readonly triggers = ["volumeUp", "volumeDown", "volumeMuted"];
  public content!: HTMLDivElement;
  public upDiv!: HTMLDivElement;
  public downDiv!: HTMLDivElement;
  public mutedDiv!: HTMLDivElement;

  public override create() {
    this.content = createEl("div", { className: "tmg-media-volume-notifier-content tmg-media-notifier-content" });
    this.upDiv = createEl("div", { className: "tmg-media-volume-up-notifier", innerHTML: IconRegistry.get("volumeHigh", true) });
    this.downDiv = createEl("div", { className: "tmg-media-volume-down-notifier", innerHTML: IconRegistry.get("volumeLow", true) });
    this.mutedDiv = createEl("div", { className: "tmg-media-volume-muted-notifier", innerHTML: IconRegistry.get("volumeMuted", true) });
    return this.bindNodes([this.content, this.upDiv, this.downDiv, this.mutedDiv]);
  }

  public override wire(): void {
    super.wire();
    // Plug Listeners
    this.ctlr.plug("settings.volume")?.state.on("aptValue", this.handleVolumeState, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.volume", this.handleVolumeState, { init: this.ctlr.payload.wired, signal: this.signal });
  }

  protected handleVolumeState({ value }: REvent<CtlrMedia, "state.volume"> | REvent<VolumeState, "aptValue">): void {
    this.content.innerHTML = `${value}% ${value > 100 ? `<strong style="color: var(--tmg-media-range-track-boost-color, red); vertical-align: 4%;">↑</strong>` : ""}`.trim();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    volumeNotifier: typeof VolumeNotifier;
  }
}
