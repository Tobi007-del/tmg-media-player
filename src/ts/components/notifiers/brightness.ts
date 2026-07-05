import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { BrightnessPlug, BrightnessState } from "@plugs/settings/brightness";

export class BrightnessNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "brightnessnotifier";
  public static readonly triggers = ["brightnessup", "brightnessdown", "brightnessdark"];
  public content!: HTMLDivElement;
  public upDiv!: HTMLDivElement;
  public downDiv!: HTMLDivElement;
  public darkDiv!: HTMLDivElement;

  public override create() {
    this.content = createEl("div", { className: "tmg-media-brightness-notifier-content tmg-media-notifier-content" });
    this.upDiv = createEl("div", { className: "tmg-media-brightness-up-notifier", innerHTML: IconRegistry.get("brightnesshigh", true) });
    this.downDiv = createEl("div", { className: "tmg-media-brightness-down-notifier", innerHTML: IconRegistry.get("brightnesslow", true) });
    this.darkDiv = createEl("div", { className: "tmg-media-brightness-dark-notifier", innerHTML: IconRegistry.get("brightnessdark", true) });
    return this.bindNodes([this.content, this.upDiv, this.downDiv, this.darkDiv]);
  }

  public override wire(): void {
    super.wire();
    // Plug Listeners
    this.ctlr.plug("settings.brightness")?.state.on("aptValue", this.handleBrightnessState, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.brightness", this.handleBrightnessState, { init: this.ctlr.payload.wired, signal: this.signal });
  }

  protected handleBrightnessState({ value }: REvent<CtlrMedia, "state.brightness"> | REvent<BrightnessState, "aptValue">): void {
    this.content.innerHTML = `${value}% ${value > 100 ? `<strong style="color: var(--tmg-media-range-track-boost-color, red); vertical-align: 4%;">↑</strong>` : ""}`.trim();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    brightnessnotifier: typeof BrightnessNotifier;
  }
}
