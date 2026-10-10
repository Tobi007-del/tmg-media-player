import { BasePlug } from "../../base";
import type { TimeConfig } from "./types";
import { TIME_BUILD } from "./build";
import { IS_MOBILE } from "@utils/env";
import { setTimeout } from "@utils/fn";
import { parseIfPercent, clamp, safeNum } from "@utils/num";
import { parseCSSTime } from "@utils/str";
import { formatMediaTime, formatUITime } from "@utils/time";
import { NIL, type REvent } from "sia-reactor";
import { CtlrMedia } from "@defs/contract";
import { silence, transaction } from "sia-reactor/modules";
import { getMediaMax, getMediaMin, getMediaTime } from "@utils/time";
import { KeyMod } from "../keys";
import { CtlrConfig } from "@defs/config";

export class TimePlug extends BasePlug<TimeConfig> {
  public static readonly plugName = "time";
  public static readonly BUILD = TIME_BUILD;
  public skipDuration = 0;
  public skipNotifier?: HTMLElement | null = null;
  protected skipTimeoutId = -1;

  public override wire(): void {
    // Variables Assignment
    this.actualStart = this.config.start ?? 0;
    // Ctlr Media Setters
    this.media.set("intent.currentTime", (v) => clamp(this.config.min, v, this.config.max), { signal: this.signal }); // #VALIDATOR: rules enforcement
    // --------- Watchers
    for (const p of ["state.currentChapter", "settings.metadata.chapterInfo"] as const) this.media.watch(p, this.syncFeatures, { init: p === "state.currentChapter", signal: this.signal });
    // ---- Config -------
    this.ctlr.config.watch("settings.time.start", () => !this.writing && (this.actualStart = +this.config.start!), { signal: this.signal });
    // ---- Media Listeners
    this.media.on("status.loadedMetadata", this.handleLoadedMetadataStatus, { signal: this.signal });
    this.media.on("state.currentTime", this.handleCurrentTimeState, { init: this.ctlr.flags.wired, signal: this.signal });
    this.media.on("status.waiting", this.handleWaitingStatus, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.time.whitelist", this.handleWhitelist, { init: true, signal: this.signal });
    // Post Wiring
    this.ctlr.learn("timeSkipFwd", { fn: this.handleSkipFwd, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn("timeSkipBwd", { fn: this.handleSkipBwd, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn("timeStart", undefined, this.signal);
    this.ctlr.learn("timeEnd", { fn: () => (this.media.intent.currentTime = this.media.status.duration) }, this.signal);
    this.ctlr.learn("timePreviousChapter", { fn: this.previousChapter, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn("timeNextChapter", { fn: this.nextChapter, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn("timeMode", { fn: this.toggleMode }, this.signal);
    this.ctlr.learn("timeFormat", { fn: this.rotateFormat }, this.signal);
    for (const n of "123456789".split("")) this.ctlr.learn(n, { fn: () => (this.media.intent.currentTime = getMediaTime(this.media, +n / 10)), system: true, label: `Time: Move to ${n}0%` }, this.signal);
    super.wire();
  }

  protected handleWhitelist({ value: paths = [] }: REvent<CtlrConfig, "settings.time.whitelist">): void {
    for (const path of paths) this.ctlr[(path.startsWith("media") ? "media" : "config") as "config"].get(path as any, this.timeHook, { signal: this.signal });
  }

  protected handleLoadedMetadataStatus({ value }: REvent<CtlrMedia, "status.loadedMetadata">): void {
    if (value && this.config.start != null && !this.media.status.ads) silence(() => (this.media.intent.currentTime = this.actualStart));
  }

  protected handleCurrentTimeState({ value }: REvent<CtlrMedia, "state.currentTime">, curr = safeNum(value), { intent: int, state: s, status: st, settings: set } = this.media): void {
    if (st.ads) return;
    (curr < this.config.min || curr > this.config.max) && silence(() => (s.loop ? (int.currentTime = this.config.min) : (int.paused = true))); // "Time Clamp Guard" if transaction
    if (st.readyState && curr && this.ctlr.flags.wired) (this.writing = true), (this.config.start = curr > set.timePlayedMin && (st.isLive ? !st.ended : curr < this.actualEnd - set.timePlayedMin) ? curr : this.config.min), (this.writing = false);
  }
  private writing = false;

  protected handleWaitingStatus({ value }: REvent<CtlrMedia, "status.waiting">): void {
    IS_MOBILE && value && this.media.once("status.waiting", () => this.ctlr.plug("settings.overlay")?.[this.skipNotifier ? "hide" : "delay"](), { signal: this.signal });
  }

  public skip(duration: number, min = getMediaMin(this.media), max = getMediaMax(this.media), time = this.media.state.currentTime): void {
    const overlay = this.ctlr.plug("settings.overlay"),
      notifier = this.ctlr.plug("settings.notifiers")?.comp("fwdBwdNotifier")?.[duration > 0 ? "fwdDiv" : "bwdDiv"];
    duration = min >= max ? 0 : safeNum(duration > 0 ? (max - time > duration ? duration : max - time) : duration < 0 ? (time - min > Math.abs(duration) ? duration : -(time - min)) : 0);
    duration && min < max && transaction(() => (this.media.intent.currentTime = time + duration), `Time skip of ${formatUITime(duration * 1000)}`); // Apprentice Slider syncs, no CSS hack
    const plug = this.ctlr.plug("settings.gesture");
    if (plug?.state.skipping) {
      if (this.skipNotifier && notifier !== this.skipNotifier) (this.skipDuration = 0), this.skipNotifier.classList.remove("tmg-media-control-persist");
      overlay?.show(), (this.skipNotifier = notifier)?.classList.add("tmg-media-control-persist");
      (this.skipDuration += duration), clearTimeout(this.skipTimeoutId);
      this.skipTimeoutId = setTimeout(
        () => {
          plug.ceaseSkip(), notifier?.classList.remove("tmg-media-control-persist");
          (this.skipDuration = 0), (this.skipNotifier = null);
          overlay?.[!this.media.state.paused ? "hide" : "show"]();
        },
        parseCSSTime(this.settings.css.notifiersAnimationTime),
        this.signal
      );
      return void notifier?.setAttribute("data-skip", String(Math.trunc(this.skipDuration)));
    } else this.skipNotifier?.classList.remove("tmg-media-control-persist");
    notifier?.setAttribute("data-skip", String(Math.trunc(Math.abs(duration))));
  }

  protected handleSkipFwd(_: KeyboardEvent, mod: KeyMod, offset: number): void {
    this.ctlr.plug("settings.gesture")?.ceaseSkip();
    this.skip(offset != null ? Math.abs(offset) : this.ctlr.plug("settings.keys")?.getModded("timeSkip", mod, this.config.skip) ?? this.config.skip);
  }
  protected handleSkipBwd(_: KeyboardEvent, mod: KeyMod, offset: number): void {
    this.ctlr.plug("settings.gesture")?.ceaseSkip();
    this.skip(offset != null ? -Math.abs(offset) : -(this.ctlr.plug("settings.keys")?.getModded("timeSkip", mod, this.config.skip) ?? this.config.skip));
  }

  public previousChapter(): void {
    this.media.features.previousChapter && silence(() => (this.media.intent.currentChapter = this.media.state.currentChapter - 1));
  }
  public nextChapter(): void {
    this.media.features.nextChapter && silence(() => (this.media.intent.currentChapter = this.media.state.currentChapter + 1));
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

  public actualStart = 0;
  public get actualEnd(): number {
    return this.config.end == null ? this.media.status.duration : this.config.end < 0 ? Math.max(0, this.media.status.duration + this.config.end) : this.config.end;
  }
  public toTimeText(time = this.media.state.currentTime, useMode = false, showMs = false, elapsed = !useMode || this.config.mode !== "remaining"): string {
    return formatMediaTime({ time: elapsed ? time : this.media.status.duration - time, format: this.config.format, elapsed, showMs });
  }
  public toTime(value?: any, duration = this.media.status.duration, autoCap = this.config.autoCap): any {
    return !duration || value == null ? value : value === "" ? undefined : Number(parseIfPercent(value, duration, autoCap));
  }
  public timeHook = (value?: any, { key = "" } = NIL) => this.toTime(value, undefined, /max$/i.test(key) ? 1 : undefined);

  public syncFeatures(): void {
    this.media.tech.polyfill("previousChapter", this.media.state.currentChapter > 0);
    this.media.tech.polyfill("nextChapter", this.media.state.currentChapter < this.media.settings.metadata.chapterInfo.length - 1);
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.time": typeof TimePlug;
  }
}

declare module "@defs/contract" {
  interface MediaFeaturesExt {
    nextChapter: boolean;
    previousChapter: boolean;
  }
}

declare module "@defs/config" {
  interface Settings {
    time: TimeConfig;
  }
}

export type * from "./types";
export * from "./build";
