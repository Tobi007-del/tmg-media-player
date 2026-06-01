import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { BrightnessPlug, BrightnessState } from "@plugs/settings/brightness";

export class TouchBrightnessNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "touchbrightnessnotifier";
  public static readonly triggers = ["brightnessup", "brightnessdown", "brightnessdark"];
  public content!: HTMLSpanElement;
  public slider!: HTMLDivElement;
  public upSpan!: HTMLSpanElement;
  public lowSpan!: HTMLSpanElement;
  public darkSpan!: HTMLSpanElement;

  public override create() {
    this.content = createEl("span", { className: "tmg-media-touch-brightness-content tmg-media-touch-vb-content", textContent: "0" });
    this.slider = createEl("div", { className: "tmg-media-touch-brightness-slider tmg-media-touch-vb-slider" });
    this.upSpan = createEl("span", { innerHTML: IconRegistry.get("brightnesshigh") });
    this.lowSpan = createEl("span", { innerHTML: IconRegistry.get("brightnesslow") });
    this.darkSpan = createEl("span", { innerHTML: IconRegistry.get("brightnessdark") });
    this.element = createEl("div", { className: "tmg-media-touch-brightness-notifier tmg-media-touch-vb-notifier" });
    this.el.append(this.content, this.slider, this.upSpan, this.lowSpan, this.darkSpan);
    return this.element;
  }

  public override wire(): void {
    super.wire();
    // Plug Listeners
    this.ctlr.plug("settings.brightness")?.state.on("aptValue", this.handleBrightnessState, { init: true, signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.brightness", this.handleBrightnessState, { init: this.ctlr.payload.wired, signal: this.signal });
  }

  protected handleBrightnessState({ value }: REvent<CtlrMedia, "state.brightness"> | REvent<BrightnessState, "aptValue">): void {
    this.content.textContent = `${value}%`;
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    touchbrightnessnotifier: typeof TouchBrightnessNotifier;
  }
}
