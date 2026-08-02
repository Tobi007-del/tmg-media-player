import { BasePlug } from "../../base";
import type { TimeConfig, TimeState } from "./types";
import { TIME_BUILD } from "./build";
import { IS_MOBILE } from "@utils/env";
import { setTimeout } from "@utils/fn";
import { parseIfPercent, clamp, safeNum } from "@utils/num";
import { parseCSSTime } from "@utils/str";
import { formatMediaTime } from "@utils/time";
import { type REvent } from "sia-reactor";
import { CtlrMedia } from "@defs/contract";
import type { Controller } from "@core/controller";
import { silence } from "sia-reactor/modules";
import { getMediaMax, getMediaMin } from "@utils/media";
import { KeyMod } from "../keys";

export class TimePlug extends BasePlug<TimeConfig, TimeState> {
  public static readonly plugName = "time";
  public static readonly BUILD = TIME_BUILD;
  public actualStart = 0;
  public skipDuration = 0;
  public skipNotifier?: HTMLElement | null = null;
  private skipDurationId = -1;

  constructor(ctlr: Controller, config = ctlr.settings.time) {
    super(ctlr, config, {
      whitelist: ["lightState.preview.time", "settings.time.min", "settings.time.max", "settings.time.start", "settings.time.end", "settings.auto.next.preview.time"], // #DEFAULT: build privilege
    });
  }

  public override wire(): void {
    // Variables Assignment
    this.actualStart = this.config.start ?? 0;
    // State Listeners
    this.state.on("whitelist", this.handleWhitelistState, { init: true, signal: this.signal });
    // Ctlr Media Setters
    this.media.set("intent.currentTime", (v) => clamp(this.config.min, v, this.config.max), { signal: this.signal }); // #VALIDATOR: rules enforcement
    // ---- Config Watchers
    this.ctlr.config.watch("settings.time.start", (v) => !this.writing && (this.actualStart = +v!), { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("status.loadedData", this.handleLoadedDataStatus, { signal: this.signal });
    this.media.on("state.currentTime", this.handleCurrentTimeState, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.waiting", this.handleWaitingStatus, { signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("skipFwd", { fn: this.handleKeySkipFwd, keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("skipBwd", { fn: this.handleKeySkipBwd, keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("timeMode", { fn: this.toggleMode, keyboard: { phase: "keyup" } });
    this.ctlr.registerAction("timeFormat", { fn: this.rotateFormat, keyboard: { phase: "keyup" } });
    super.wire();
  }

  protected handleWhitelistState({ value: paths = [] }: REvent<TimeState, "whitelist">): void {
    for (const path of paths) this.ctlr.config.get(path, this.toTime, { signal: this.signal });
  }

  protected handleLoadedDataStatus({ value }: REvent<CtlrMedia, "status.loadedData">): void {
    if (value && this.config.start != null && this.media.state.currentTime !== this.actualStart) this.media.intent.currentTime = this.actualStart;
  }

  protected handleCurrentTimeState({ value: curr }: REvent<CtlrMedia, "state.currentTime">): void {
    curr = safeNum(curr);
    (curr < this.config.min || curr > this.config.max) && silence(() => ((this.media.intent.currentTime = this.config.loop ? this.config.min : curr), !this.config.loop && (this.media.intent.paused = true))); // "Time Clamp Guard" if transaction
    if (this.media.status.readyState && curr && this.ctlr.payload.wired) (this.writing = true), (this.config.start = curr > this.toTime(3) && curr < (this.config.end ?? this.media.status.duration) - this.toTime(3) ? curr : this.actualStart), (this.writing = false);
  }
  private writing = false;

  protected handleWaitingStatus({ value }: REvent<CtlrMedia, "status.waiting">): void {
    IS_MOBILE && value && this.media.once("status.waiting", () => this.ctlr.plug("settings.overlay")?.[this.skipNotifier ? "hide" : "delay"](), { signal: this.signal });
  }

  public toTime(value?: any): number {
    return parseIfPercent(value, this.media.status.duration);
  }
  public toTimeText(time = this.media.state.currentTime, useMode = false, showMs = false): string {
    if (!useMode || this.config.mode !== "remaining") return formatMediaTime({ time, format: this.config.format, elapsed: true, showMs });
    return formatMediaTime({ time: this.media.status.duration - time, format: this.config.format, elapsed: false, showMs });
  }

  public get nextMode(): TimeConfig["mode"] {
    return this.config.mode === "elapsed" ? "remaining" : "elapsed";
  }
  public toggleMode(): void {
    this.config.mode = this.nextMode;
  }

  public get nextFormat(): TimeConfig["format"] {
    return this.config.format === "digital" ? "human" : this.config.format === "human" ? "human-long" : "digital";
  }
  public rotateFormat(): void {
    this.config.format = this.nextFormat;
  }

  public skip(duration: number): void {
    const overlay = this.ctlr.plug("settings.overlay"),
      notifier = this.ctlr.plug("settings.notifiers")?.comp("fwdbwdnotifier")?.[duration > 0 ? "fwdDiv" : "bwdDiv"],
      [min, max, time] = [getMediaMin(this.media), getMediaMax(this.media), this.media.state.currentTime];
    duration = min >= max ? 0 : safeNum(duration > 0 ? (max - time > duration ? duration : max - time) : duration < 0 ? (time - min > Math.abs(duration) ? duration : -(time - min)) : 0);
    if (min < max) this.media.intent.currentTime = time + duration; // Apprentice Slider syncs, no CSS hack
    // this.settings.css.currentPlayedPosition = this.settings.css.currentThumbPosition = safeNum(this.media.intent.currentTime / this.media.status.duration);
    const plug = this.ctlr.plug("settings.gesture");
    if (plug?.state.skipPersist) {
      if (this.skipNotifier && notifier !== this.skipNotifier) {
        this.skipDuration = 0;
        this.skipNotifier.classList.remove("tmg-media-control-persist");
      }
      overlay?.show();
      this.skipNotifier = notifier;
      notifier?.classList.add("tmg-media-control-persist");
      this.skipDuration += duration;
      clearTimeout(this.skipDurationId);
      this.skipDurationId = setTimeout(
        () => {
          plug.stopSkipPersist();
          notifier?.classList.remove("tmg-media-control-persist");
          this.skipDuration = 0;
          this.skipNotifier = null;
          !this.media.state.paused ? overlay?.hide() : overlay?.show();
        },
        parseCSSTime(this.settings.css.notifiersAnimationTime),
        this.signal
      );
      return void notifier?.setAttribute("data-skip", String(Math.trunc(this.skipDuration)));
    } else this.skipNotifier?.classList.remove("tmg-media-control-persist");
    notifier?.setAttribute("data-skip", String(Math.trunc(Math.abs(duration))));
  }

  protected handleKeySkipFwd(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.stopSkipPersist();
    this.skip(this.ctlr.plug("settings.keys")?.getModded("skip", mod, this.config.skip) ?? this.config.skip);
  }

  protected handleKeySkipBwd(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.stopSkipPersist();
    this.skip(-(this.ctlr.plug("settings.keys")?.getModded("skip", mod, this.config.skip) ?? this.config.skip));
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.time": typeof TimePlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    time: TimeConfig;
  }
}

export type * from "./types";
export * from "./build";
