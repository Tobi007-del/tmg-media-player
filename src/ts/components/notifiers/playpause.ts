import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class PlayPauseNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "playPauseNotifier";
  public static readonly triggers = ["mediaPlay", "mediaPause"];
  public playDiv!: HTMLDivElement;
  public pauseDiv!: HTMLDivElement;

  public override create() {
    this.playDiv = createEl("div", { className: "tmg-media-play-notifier", innerHTML: IconRegistry.get("play", true) });
    this.pauseDiv = createEl("div", { className: "tmg-media-pause-notifier", innerHTML: IconRegistry.get("pause", true) });
    return this.bindNodes([this.playDiv, this.pauseDiv]);
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    playPauseNotifier: typeof PlayPauseNotifier;
  }
}
