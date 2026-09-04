import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";

export class FastPlayNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "fastPlayNotifier";
  public static readonly triggers = ["fastPlay"];
  public text!: HTMLParagraphElement;

  public override create() {
    this.element = createEl("div", { className: "tmg-media-fast-play-notifier tmg-media-text-notifier tmg-media-top-text-notifier", innerHTML: `${IconRegistry.get("doubleTriangleLeft")}${IconRegistry.get("doubleTriangleRight")}` });
    this.text = createEl("p", { className: "tmg-media-fast-play-notifier-text" });
    return this.el.insertBefore(this.text, this.el.lastChild), this.el;
  }

  public override wire(): void {
    super.wire();
    // Ctlr Media Listeners
    this.media.on("state.playbackRate", this.handlePlaybackRateState, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.currentTime", this.handleCurrentTimeState, { init: this.ctlr.payload.wired, signal: this.signal });
  }

  protected handlePlaybackRateState({ value }: REvent<CtlrMedia, "state.playbackRate">): void {
    this.text.textContent = `${value}x`;
  }

  protected handleCurrentTimeState({ value }: REvent<CtlrMedia, "state.currentTime">): void {
    this.el.setAttribute("data-current-time", this.ctlr.plug("settings.time")?.toTimeText(value, true) || "");
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    fastPlayNotifier: typeof FastPlayNotifier;
  }
}
