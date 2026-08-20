import { BasePlug } from "@plugs/base";
import type { Controller } from "@core/controller";
import type { SleepTimerConfig, SleepTimerState } from "./types";
import { SLEEP_TIMER_BUILD } from "./build";
import { formatUITime } from "@utils/time";
import { IconRegistry } from "@core/registries";
import { setTimeout } from "sia-reactor/utils";

export class SleepTimerPlug extends BasePlug<SleepTimerConfig, SleepTimerState> {
  public static readonly plugName = "sleepTimer";
  public static readonly BUILD = SLEEP_TIMER_BUILD;
  private targetTime = 0;
  private timeoutId?: number;

  constructor(ctlr: Controller, config = ctlr.settings.sleepTimer) {
    super(ctlr, config, { ms: 0 });
  }

  public override wire(): void {
    // Ctlr Media Listeners
    this.media.on("state.currentTime", this.checkTimer, { signal: this.signal });
    // Post Wiring
    super.wire();
  }

  public setTimer(ms: number): void {
    this.state.ms = ms;
    clearTimeout(this.timeoutId);
    this.targetTime = ms < 0 ? -1 : 0;
    if (ms === 0) return void this.ctlr.plug("settings.toasts")?.toast?.("Sleep timer turned off", { icon: IconRegistry.get("timer", true), tag: "tmg-stmr", signal: this.signal });
    if (ms === -1) return void this.ctlr.plug("settings.toasts")?.toast?.("Sleep timer set to end of video", { icon: IconRegistry.get("timer", true), tag: "tmg-stmr", signal: this.signal });
    this.timeoutId = setTimeout(this.triggerSleep, ms, this.signal);
    this.ctlr.plug("settings.toasts")?.toast?.(`Sleep timer set for ${formatUITime(ms, true)}`, { icon: IconRegistry.get("timer", true), tag: "tmg-stmr", signal: this.signal });
  }

  private checkTimer(): void {
    if (this.targetTime === -1 && this.media.status.duration > 0 && this.media.state.currentTime >= this.media.status.duration - 0.5) this.triggerSleep();
  }

  private triggerSleep(): void {
    this.media.intent.paused = true;
    this.setTimer(0), this.ctlr.plug("settings.notifiers")?.notify("timer");
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
