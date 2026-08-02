import { BaseSliderPlug } from "@plugs/base/slider";
import type { BrightnessConfig, BrightnessState } from "./types";
import { BRIGHTNESS_BUILD } from "./build";
import type { Controller } from "@core/controller";
import { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { clamp } from "@utils/num";
import { KeyMod } from "../keys";

export class BrightnessPlug extends BaseSliderPlug<BrightnessConfig, BrightnessState> {
  public static readonly plugName = "brightness";
  public static readonly BUILD = BRIGHTNESS_BUILD;
  protected get toggleKey() {
    return "dark" as const;
  }

  constructor(ctlr: Controller, config = ctlr.settings.brightness) {
    super(ctlr, config, { aptValue: 100 });
  }

  public override wire(): void {
    // Variables Assignment
    const brightness = this.media.intent.brightness ?? this.media.state.brightness ?? this.settings.css.brightness;
    this.state.aptValue = clamp(this.config.min, brightness, this.config.max);
    this.shouldToggle = this.shouldSetAptValue = this.media.intent.dark ?? false;
    this.media.intent.brightness = this.shouldToggle ? 0 : this.state.aptValue;
    // Ctlr Media Setters
    this.media.set("intent.brightness", (v) => clamp(this.shouldToggle ? 0 : this.config.min, v, this.config.max), { signal: this.signal }); // #VALIDATOR: rules enforcement
    // ----------- Watchers
    this.media.watch("tech", () => ((this.media.features.brightness ||= true), (this.media.features.dark ||= true)), { init: true, signal: this.signal });
    // ----------- Listeners
    this.media.on("intent.brightness", this.handleBrightnessIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.dark", this.handleDarkIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.brightness", (e) => this.handleSliderState(e.value), { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config ---------
    this.ctlr.config.on("settings.brightness.min", (e) => this.handleMin(e.value), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.brightness.max", (e) => this.handleMax(e.value), { init: true, signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("dark", { fn: this.handleKeyDark, keyboard: { phase: "keyup" } });
    this.ctlr.registerAction("brightnessUp", { fn: this.handleKeyBrightnessUp, keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("brightnessDown", { fn: this.handleKeyBrightnessDown, keyboard: { phase: "keydown" } });
    super.wire();
  }

  protected handleBrightnessIntent(e: REvent<CtlrMedia, "intent.brightness">, isNext = this.nextLevel === e.value): void {
    if (e.resolved) return;
    if (isNext) this.nextLevel = null;
    this.setValueState(e.value, isNext);
    this.media.state.brightness = this.settings.css.brightness = e.value;
    // e.resolve(this.name); // #UMBRELLA: must envelope logic
  }

  protected handleDarkIntent(e: REvent<CtlrMedia, "intent.dark">, isNext = this.nextToggle === e.value): void {
    if (e.resolved) return;
    if (isNext) this.nextToggle = null;
    else if (this.media.state.dark === e.value && !!this.media.state.brightness) return e.resolve(this.name);
    this.setToggleState(e.value, isNext);
    this.media.state.dark = e.value;
    // e.resolve(this.name); // #UMBRELLA: must envelope logic
  }

  protected handleKeyDark(): void {
    this.toggle("auto");
    this.media.features.brightness && this.media.wonce("state.brightness", (v) => this.ctlr.plug("settings.notifiers")?.notify(!v ? "brightnessdark" : "brightnessup"), { signal: this.signal });
  }
  protected handleKeyBrightnessUp(_: KeyboardEvent, mod: KeyMod): void {
    this.changeAptValue(this.ctlr.plug("settings.keys")?.getModded("brightness", mod, this.config.skip) ?? this.config.skip);
  }
  protected handleKeyBrightnessDown(_: KeyboardEvent, mod: KeyMod): void {
    this.changeAptValue(-(this.ctlr.plug("settings.keys")?.getModded("brightness", mod, this.config.skip) ?? this.config.skip));
    if (this.media.features.brightness) !this.media.state.brightness ? this.ctlr.plug("settings.notifiers")?.notify("brightnessmuted") : this.media.wonce("state.brightness", (v) => this.ctlr.plug("settings.notifiers")?.notify(!v ? "brightnessdark" : "brightnessdown"), { signal: this.signal });
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
    brightness: BrightnessConfig;
  }
}
