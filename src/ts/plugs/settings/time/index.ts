import { BasePlug } from "../../base";
import type { TimeConfig, TimeState } from "./types";
import { TIME_BUILD } from "./build";
import { IS_MOBILE } from "@utils/env";
import { setTimeout } from "@utils/fn";
import { parseIfPercent, clamp, safeNum } from "@utils/num";
import { parseCSSTime } from "@utils/str";
import { formatMediaTime, formatUITime } from "@utils/time";
import { type REvent } from "sia-reactor";
import { CtlrMedia } from "@defs/contract";
import type { Controller } from "@core/controller";
import { silence, transaction } from "sia-reactor/modules";
import { getMediaMax, getMediaMin, getMediaTime } from "@utils/time";
import { KeyMod } from "../keys";

export class TimePlug extends BasePlug<TimeConfig, TimeState> {
  public static readonly plugName = "time";
  public static readonly BUILD = TIME_BUILD;
  public actualStart = 0;
  public skipDuration = 0;
  public skipNotifier?: HTMLElement | null = null;
  protected skipDurationId = -1;

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
    this.media.on("status.loadedMetadata", this.handleLoadedMetadataStatus, { signal: this.signal });
    this.media.on("state.currentTime", this.handleCurrentTimeState, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.waiting", this.handleWaitingStatus, { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("timeSkipFwd", { fn: this.handleKeySkipFwd, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn("timeSkipBwd", { fn: this.handleKeySkipBwd, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn("timeStart", { keyboard: { phase: "keyup" } }, this.signal);
    this.ctlr.learn("timeEnd", { fn: () => (this.media.intent.currentTime = this.media.status.duration), keyboard: { phase: "keyup" } }, this.signal);
    this.ctlr.learn("timeMode", { fn: this.toggleMode, keyboard: { phase: "keyup" } }, this.signal);
    this.ctlr.learn("timeFormat", { fn: this.rotateFormat, keyboard: { phase: "keyup" } }, this.signal);
    for (const n of "123456789".split("")) this.ctlr.learn(n, { fn: () => (this.media.intent.currentTime = getMediaTime(this.media, +n / 10)), keyboard: { phase: "keyup" }, system: true, label: `Time: Move to ${n}0%` }, this.signal);
    super.wire();
  }

  protected handleWhitelistState({ value: paths = [] }: REvent<TimeState, "whitelist">): void {
    for (const path of paths) this.ctlr.config.get(path, this.toTime, { signal: this.signal });
  }

  protected handleLoadedMetadataStatus({ value }: REvent<CtlrMedia, "status.loadedMetadata">): void {
    if (value && this.config.start != null && this.media.state.currentTime !== this.actualStart) this.media.intent.currentTime = this.actualStart;
  }

  protected handleCurrentTimeState({ value }: REvent<CtlrMedia, "state.currentTime">, curr = safeNum(value), pmin?: number): void {
    const { intent: int, status: st, settings: set } = this.media;
    (curr < this.config.min || curr > this.config.max) && silence(() => ((int.currentTime = this.config.loop ? this.config.min : curr), !this.config.loop && (int.paused = true))); // "Time Clamp Guard" if transaction
    if (st.readyState && curr && this.ctlr.payload.wired) (this.writing = true), (this.config.start = curr > (pmin = this.toTime(set.timePlayedMin)) && curr < (this.config.end ?? st.duration) - pmin ? curr : this.actualStart), (this.writing = false);
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

  public skip(duration: number, min = getMediaMin(this.media), max = getMediaMax(this.media), time = this.media.state.currentTime): void {
    const overlay = this.ctlr.plug("settings.overlay"),
      notifier = this.ctlr.plug("settings.notifiers")?.comp("fwdBwdNotifier")?.[duration > 0 ? "fwdDiv" : "bwdDiv"];
    duration = min >= max ? 0 : safeNum(duration > 0 ? (max - time > duration ? duration : max - time) : duration < 0 ? (time - min > Math.abs(duration) ? duration : -(time - min)) : 0);
    duration && min < max && transaction(() => (this.media.intent.currentTime = time + duration), `Time skip of ${formatUITime(duration * 1000)}`); // Apprentice Slider syncs, no CSS hack
    const plug = this.ctlr.plug("settings.gesture");
    if (plug?.state.skipPersist) {
      if (this.skipNotifier && notifier !== this.skipNotifier) (this.skipDuration = 0), this.skipNotifier.classList.remove("tmg-media-control-persist");
      overlay?.show(), (this.skipNotifier = notifier)?.classList.add("tmg-media-control-persist");
      (this.skipDuration += duration), clearTimeout(this.skipDurationId);
      this.skipDurationId = setTimeout(
        () => {
          plug.stopSkipPersist(), notifier?.classList.remove("tmg-media-control-persist");
          (this.skipDuration = 0), (this.skipNotifier = null);
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
    this.skip(this.ctlr.plug("settings.keys")?.getModded("timeSkip", mod, this.config.skip) ?? this.config.skip);
  }

  protected handleKeySkipBwd(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.stopSkipPersist();
    this.skip(-(this.ctlr.plug("settings.keys")?.getModded("timeSkip", mod, this.config.skip) ?? this.config.skip));
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
