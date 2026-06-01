import { BasePlug } from "../../base";
import type { KeyMod } from "../keys";
import type { Brightness, BrightnessState } from "./types";
import { BRIGHTNESS_BUILD } from "./build";
import type { Controller } from "@core/controller";
import { REvent } from "sia-reactor";
import type { CtlrConfig } from "@defs/config";
import type { CtlrMedia } from "@defs/contract";
import { clamp } from "@utils/num";

export class BrightnessPlug extends BasePlug<Brightness, BrightnessState> {
  public static readonly plugName = "brightness";
  public static readonly BUILD = BRIGHTNESS_BUILD;
  protected shouldDark = false;
  protected sliderAptValue = 100;
  protected shouldSetAptValue = false;

  constructor(ctlr: Controller, config: Brightness = ctlr.config.settings.brightness) {
    super(ctlr, config, { aptValue: 100 });
  }

  public override wire(): void {
    // Variables Assignment
    const brightness = this.media.intent.brightness ?? this.media.state.brightness ?? this.ctlr.settings.css.brightness ?? 100;
    this.state.aptValue = clamp(this.config.min, brightness, this.config.max);
    this.shouldDark = this.shouldSetAptValue = this.media.intent.dark ?? false;
    this.media.intent.brightness = this.shouldDark ? 0 : this.state.aptValue;
    // Ctlr Media Setters
    this.media.set("intent.brightness", (value) => clamp(this.shouldDark ? 0 : this.config.min, value, this.config.max), { signal: this.signal }); // #VALIDATOR: rules enforcement
    // ---- Media Listeners
    this.media.on("tech", () => (this.media.features.brightness ||= true), { init: true, signal: this.signal });
    this.media.on("intent.brightness", this.handleBrightnessIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.dark", this.handleDarkIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.brightness", this.handleBrightnessState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config -------
    this.ctlr.config.on("settings.brightness.min", this.handleMin, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.brightness.max", this.handleMax, { init: true, signal: this.signal });
    // Post Wiring
    const keys = this.ctlr.plug("settings.keys");
    keys?.register("dark", this.handleKeyDark, { phase: "keyup" });
    keys?.register("brightnessUp", this.handleKeyBrightnessUp, { phase: "keydown" });
    keys?.register("brightnessDown", this.handleKeyBrightnessDown, { phase: "keydown" });
  }

  protected handleBrightnessIntent(e: REvent<CtlrMedia, "intent.brightness">): void {
    if (e.resolved) return;
    this.setBrightnessState(e.value);
    this.media.state.brightness = e.value;
    e.resolve(this.name);
  }

  protected handleDarkIntent(e: REvent<CtlrMedia, "intent.dark">): void {
    if (e.resolved) return;
    if (this.media.state.dark === e.value && !!this.media.state.brightness) return e.resolve(this.name);
    this.setDarkState(e.value);
    this.media.state.dark = e.value;
    e.resolve(this.name);
  }

  protected handleMin({ value: min }: REvent<CtlrConfig, "settings.brightness.min">): void {
    if (this.media.state.brightness < min) this.media.intent.brightness = min;
    if (this.state.aptValue < min) this.state.aptValue = min;
  }

  protected handleMax({ value: max }: REvent<CtlrConfig, "settings.brightness.max">): void {
    if (this.media.state.brightness > max) this.media.intent.brightness = max;
    if (this.state.aptValue > max) this.state.aptValue = max;
    this.media.container.classList.toggle("tmg-media-brightness-boost", max > 100);
    this.ctlr.settings.css.brightnessSliderPercent = Math.round((100 / max) * 100);
    this.ctlr.settings.css.maxBrightnessRatio = max / 100;
  }

  protected handleBrightnessState({ value: b }: REvent<CtlrMedia, "state.brightness">): void {
    const bLevel = b === 0 ? "dark" : b < 50 ? "low" : b <= 100 ? "high" : "boost",
      bPercent = (b - 0) / (this.config.max - 0);
    this.media.container.dataset.brightnessLevel = bLevel;
    if (this.config.max > 100) {
      if (b <= 100) {
        this.ctlr.settings.css.currentBrightnessSliderPosition = (b - 0) / (100 - 0);
        this.ctlr.settings.css.currentBrightnessSliderBoostPosition = 0;
        this.ctlr.settings.css.brightnessSliderBoostPercent = 0;
      } else {
        this.ctlr.settings.css.currentBrightnessSliderPosition = 1;
        this.ctlr.settings.css.currentBrightnessSliderBoostPosition = (b - 100) / (this.config.max - 100);
        this.ctlr.settings.css.brightnessSliderBoostPercent = this.ctlr.settings.css.brightnessSliderPercent;
      }
    } else this.ctlr.settings.css.currentBrightnessSliderPosition = bPercent;
  }

  protected setBrightnessState(value: number): void {
    const b = clamp(this.shouldDark ? 0 : this.config.min, value, this.config.max);
    this.ctlr.settings.css.brightness = b;
    if (b > 0) this.media.intent.dark = false; // youtube courtesy
  } // #STANDALONE: needs scoped behavior

  protected setDarkState(dark: boolean): void {
    if (dark) {
      if (this.media.state.brightness) {
        this.state.aptValue = this.media.state.brightness;
        this.shouldSetAptValue = true;
      }
      this.shouldDark = true;
      if (this.media.state.brightness) this.media.intent.brightness = 0;
    } else {
      const restore = this.shouldSetAptValue ? this.state.aptValue : this.media.state.brightness;
      this.media.intent.brightness = restore ? restore : this.sliderAptValue;
      this.shouldDark = this.shouldSetAptValue = false;
    }
  } // #STANDALONE: needs scoped behavior

  public toggleDark(option?: "auto"): void {
    if (option === "auto" && this.shouldSetAptValue && !this.state.aptValue) this.state.aptValue = this.config.skip;
    this.media.intent.dark = !(this.media.state.dark || !this.media.state.brightness);
  }

  public changeAptValue(value: number): void {
    const sign = value >= 0 ? "+" : "-";
    value = Math.abs(value);
    let brightness = this.shouldSetAptValue ? this.state.aptValue : this.media.state.brightness;
    if (sign === "-") {
      if (brightness > this.config.min) brightness -= brightness % value || value;
      this.ctlr.plug("settings.notifiers")?.notify(brightness === 0 ? "brightnessdark" : "brightnessdown");
    } else {
      if (brightness < this.config.max) brightness += brightness % value ? value - (brightness % value) : value;
      this.ctlr.plug("settings.notifiers")?.notify("brightnessup");
    }
    this.shouldSetAptValue ? (this.state.aptValue = brightness) : (this.media.intent.brightness = brightness);
  }

  protected handleKeyDark(): void {
    this.toggleDark("auto");
    this.media.wonce("state.brightness", (v) => this.ctlr.plug("settings.notifiers")?.notify(!v ? "brightnessdark" : "brightnessup"), { signal: this.signal });
  }
  protected handleKeyBrightnessUp(_: KeyboardEvent, mod: KeyMod): void {
    this.changeAptValue(this.ctlr.plug("settings.keys")!.getModded("brightness", mod, this.config.skip));
  }
  protected handleKeyBrightnessDown(_: KeyboardEvent, mod: KeyMod): void {
    this.changeAptValue(-this.ctlr.plug("settings.keys")!.getModded("brightness", mod, this.config.skip));
  }

  public handleSliderInput(brightness: number): void {
    this.shouldDark = this.shouldSetAptValue = false;
    this.media.intent.brightness = brightness;
    if (brightness > 5) this.sliderAptValue = brightness;
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.brightness": typeof BrightnessPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    brightness: Brightness;
  }
}
