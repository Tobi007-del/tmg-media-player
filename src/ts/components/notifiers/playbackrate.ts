import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";

export class PlaybackRateNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "playbackRateNotifier";
  public static readonly triggers = ["playbackRateUp", "playbackRateDown"];
  public content!: HTMLDivElement;
  public upDiv!: HTMLDivElement;
  public downDiv!: HTMLDivElement;

  public override create() {
    this.content = createEl("div", { className: "tmg-media-playback-rate-notifier-content tmg-media-notifier-content" });
    this.upDiv = createEl("div", { className: "tmg-media-playback-rate-up-notifier", innerHTML: IconRegistry.get("doubleTriangleRight") });
    this.downDiv = createEl("div", { className: "tmg-media-playback-rate-down-notifier", innerHTML: IconRegistry.get("doubleTriangleLeft") });
    return this.bindNodes([this.content, this.upDiv, this.downDiv]);
  }

  public override wire(): void {
    super.wire();
    // Ctlr Media Listeners
    this.media.on("state.playbackRate", this.handlePlaybackRateState, { init: this.ctlr.payload.wired, signal: this.signal });
  }

  protected handlePlaybackRateState({ value }: REvent<CtlrMedia, "state.playbackRate">): void {
    this.content.textContent = `${value}x`;
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    playbackRateNotifier: typeof PlaybackRateNotifier;
  }
}
