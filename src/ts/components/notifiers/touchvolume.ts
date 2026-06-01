import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { VolumePlug, VolumeState } from "@plugs/settings/volume";

export class TouchVolumeNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "touchvolumenotifier";
  public static readonly triggers = ["volumeup", "volumedown", "volumemuted"];
  public content!: HTMLSpanElement;
  public slider!: HTMLDivElement;
  public upSpan!: HTMLSpanElement;
  public lowSpan!: HTMLSpanElement;
  public mutedSpan!: HTMLSpanElement;

  public override create() {
    this.content = createEl("span", { className: "tmg-media-touch-volume-content tmg-media-touch-vb-content", textContent: "0" });
    this.slider = createEl("div", { className: "tmg-media-touch-volume-slider tmg-media-touch-vb-slider" });
    this.upSpan = createEl("span", { innerHTML: IconRegistry.get("volumehigh") });
    this.lowSpan = createEl("span", { innerHTML: IconRegistry.get("volumelow") });
    this.mutedSpan = createEl("span", { innerHTML: IconRegistry.get("volumemuted") });
    this.element = createEl("div", { className: "tmg-media-touch-volume-notifier tmg-media-touch-vb-notifier" });
    this.el.append(this.content, this.slider, this.upSpan, this.lowSpan, this.mutedSpan);
    return this.element;
  }

  public override wire(): void {
    super.wire();
    // Plug Listeners
    this.ctlr.plug("settings.volume")?.state.on("aptValue", this.handleVolumeState, { init: true, signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.volume", this.handleVolumeState, { init: this.ctlr.payload.wired, signal: this.signal });
  }

  protected handleVolumeState({ value }: REvent<CtlrMedia, "state.volume"> | REvent<VolumeState, "aptValue">): void {
    this.content.textContent = `${value}%`;
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    touchvolumenotifier: typeof TouchVolumeNotifier;
  }
}
