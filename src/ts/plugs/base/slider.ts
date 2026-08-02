import { BasePlug } from ".";
import { MediaIntent, MediaFeatures } from "@defs/contract";
import type { OptRange } from "@defs/generics";
import { capitalize } from "@utils/str";
import { silence } from "sia-reactor/modules";

export interface SliderState {
  aptValue: number;
}

export abstract class BaseSliderPlug<Config extends OptRange, State extends SliderState> extends BasePlug<Config, State> {
  public shouldToggle = false;
  public sliderAptValue = 100;
  public shouldSetAptValue = false;
  protected nextToggle: boolean | null = null;
  protected nextLevel: number | null = null;
  // ABSTRACT HOOKS: The Child classes will define these to route the math to the right place
  protected get prefix(): keyof MediaIntent {
    return this.name as keyof MediaIntent;
  } // e.g., "volume" or "brightness"
  protected abstract get toggleKey(): keyof MediaIntent; // e.g., "muted" or "dark"

  // --- 1. Shared CSS Boost & Limits Math ---
  protected handleMin(min: number): void {
    if (this.media.state[this.prefix] < min) this.media.intent[this.prefix] = min as never;
    if (this.state.aptValue < min) this.state.aptValue = min;
  }
  protected handleMax(max: number): void {
    if (this.media.state[this.prefix] > max) this.media.intent[this.prefix] = max as never;
    if (this.state.aptValue > max) this.state.aptValue = max;
    this.media.container.classList.toggle(`tmg-media-${this.prefix}-boost`, max > 100);
    this.settings.css[`${this.prefix}SliderPercent`] = Math.round((100 / max) * 100);
    this.settings.css[`max${capitalize(this.prefix)}Ratio`] = max / 100;
  }
  protected handleSliderState(value: number): void {
    const strLevel = value === 0 ? this.toggleKey : value < 50 ? "low" : value <= 100 ? "high" : "boost",
      percent = (value - 0) / (this.config.max - 0);
    this.media.container.dataset[`${this.prefix}Level`] = strLevel;
    const CSS = this.settings.css,
      capped = capitalize(this.prefix);
    if (this.config.max > 100) if (value <= 100) {
            CSS[`current${capped}SliderPosition`] = value / 100;
            CSS[`current${capped}SliderBoostPosition`] = CSS[`${this.prefix}SliderBoostPercent`] = 0;
          } else {
            CSS[`current${capped}SliderPosition`] = 1;
            CSS[`current${capped}SliderBoostPosition`] = (value - 100) / (this.config.max - 100);
            CSS[`${this.prefix}SliderBoostPercent`] = CSS[`${this.prefix}SliderPercent`];
          } else CSS[`current${capped}SliderPosition`] = percent;
  }
  // --- 2. The "Sticky Note" Architecture ---
  protected setValueState(value: number, isNext = this.nextLevel === value): void {
    if (!isNext && value > 0) silence(() => (this.media.intent[this.toggleKey] = (this.nextToggle = false) as never));
  }
  protected setToggleState(toggled: boolean, isNext = this.nextToggle === toggled): void {
    if (toggled) {
      if (this.media.state[this.prefix]) (this.state.aptValue = this.media.state[this.prefix]), (this.shouldSetAptValue = true);
      this.shouldToggle = true;
      if (!isNext && this.media.state[this.prefix]) silence(() => (this.media.intent[this.prefix] = (this.nextLevel = 0) as never));
    } else {
      const restore = this.shouldSetAptValue ? this.state.aptValue : this.media.state[this.prefix];
      if (!isNext) silence(() => (this.media.intent[this.prefix] = (this.nextLevel = restore ? restore : this.sliderAptValue) as never));
      this.shouldToggle = this.shouldSetAptValue = false;
    }
  }
  // --- 3. The Slider UI Input ---
  public handleSliderInput(value: number): void {
    this.shouldToggle = this.shouldSetAptValue = false;
    this.media.intent[this.prefix] = value as never;
    if (value > 5) this.sliderAptValue = value;
  }
  public toggle(option?: "auto"): void {
    if (option === "auto" && this.shouldSetAptValue && !this.state.aptValue) this.state.aptValue = this.config.skip;
    this.media.intent[this.toggleKey] = !(this.media.state[this.toggleKey] || !this.media.state[this.prefix]) as never;
  }
  // --- 4. The Mathematical Grid Snapping ---
  public changeAptValue(value: number): void {
    const sign = value >= 0 ? "+" : "-";
    value = Math.abs(value);
    let level = Math.round(this.shouldSetAptValue ? this.state.aptValue : this.media.state[this.prefix]);
    if (sign === "-") {
      if (level > this.config.min) level -= level % value || value;
      this.media.features[this.prefix as keyof MediaFeatures] && this.ctlr.plug("settings.notifiers")?.notify(level === 0 ? `${this.prefix}${this.toggleKey}` : `${this.prefix}down`);
    } else {
      if (level < this.config.max) level += level % value ? value - (level % value) : value;
      this.media.features[this.prefix as keyof MediaFeatures] && this.ctlr.plug("settings.notifiers")?.notify(`${this.prefix}up`);
    }
    this.shouldSetAptValue ? (this.state.aptValue = level) : (this.media.intent[this.prefix] = level as never);
  }
} // ts, look what u made me do, "never" did I imagine :)
