import { BasePlug } from "@plugs/base";
import type { SleepTimerConfig } from "./types";
import { SLEEP_TIMER_BUILD } from "./build";
import { formatUITime } from "@utils/time";
import { setTimeout, clamp } from "sia-reactor/utils";
import type { REvent } from "sia-reactor";
import type { CtlrConfig } from "@defs/config";
import { IconRegistry } from "@core/registries";

export class SleepTimerPlug extends BasePlug<SleepTimerConfig> {
  public static readonly plugName = "sleepTimer";
  public static readonly BUILD = SLEEP_TIMER_BUILD;
  protected timeoutId = -1;

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", () => this.media.tech.polyfill("sleepTimer", !this.media.status.ads), { init: true, signal: this.signal });
    // ---------- Listeners
    this.media.on("state.currentTime", ({ value }) => this.config.ms === -1 && this.media.status.duration > 0 && value >= this.media.status.duration - 0.5 && this.trigger(), { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.sleepTimer.ms", this.handleMs, { init: true, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleMs({ value }: REvent<CtlrConfig, "settings.sleepTimer.ms">): void {
    clearTimeout(this.timeoutId);
    if (value == null) return void delete this.config.target;
    if (value > 0 && (this.timeoutId !== -1 || !this.config.target)) this.config.target = Date.now() + value;
    const rem = value > 0 ? this.config.target! - Date.now() : 0;
    this.ctlr.toast?.(`Sleep timer ${value > 0 ? `set for ${formatUITime(rem, false, false)}` : !value ? "turned off" : `set to end of ${this.media.type}`}`, { icon: IconRegistry.get("timer", true), tag: "tmg-stmr", signal: this.signal });
    if (value > 0) rem <= 0 ? this.trigger() : (this.timeoutId = setTimeout(this.trigger, clamp(0, rem, 2147483647), this.signal));
  }

  protected async trigger(): Promise<void> {
    this.media.intent.paused = true;
    delete this.config.ms, delete this.config.target;
    const id = `${this.ctlr.config.id}-sleep-timer-dialog`;
    if (t007.dialog?.isActive(id)) return;
    const menu = this.ctlr.plug("settings.panel")?.menu;
    if ((await t007[menu ? "confirm" : "alert"]?.(`<h3 style="margin-bottom: 10px;">Time's up</h3><div>We hope you're fast asleep, but you can always add more time</div>`, { id, rootElement: this.ctlr.DOM.content, confirmText: "Close", cancelText: "Add time" })) === false) menu?.open(), menu?.goTo("sleepTimer");
  }
}

export * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.sleepTimer": typeof SleepTimerPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    sleepTimer: SleepTimerConfig;
  }
}

declare module "@defs/contract" {
  interface MediaFeaturesExt {
    sleepTimer: boolean;
  }
}
