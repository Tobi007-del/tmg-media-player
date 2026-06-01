import { BasePlug } from "../../base";
import type { KeyMod } from "../keys";
import type { CTime, TimeState } from "./types";
import { TIME_BUILD } from "./build";
import { IS_MOBILE } from "@utils/browser";
import { setTimeout } from "@utils/fn";
import { parseIfPercent, clamp, safeNum } from "@utils/num";
import { parseCSSTime } from "@utils/str";
import { formatMediaTime } from "@utils/time";
import { type REvent } from "sia-reactor";
import { CtlrMedia } from "@defs/contract";
import type { Controller } from "@core/controller";

export class TimePlug extends BasePlug<CTime, TimeState> {
  public static readonly plugName = "time";
  public static readonly BUILD = TIME_BUILD;
  private realStart = 0;
  private pseudoStart = 0;
  private skipDuration = 0;
  private skipDurationId = -1;
  private skipNotifier?: HTMLElement | null = null;

  constructor(ctlr: Controller, config: CTime = ctlr.config.settings.time) {
    super(ctlr, config, {
      guardedPaths: ["lightState.preview.time", "settings.time.min", "settings.time.max", "settings.time.start", "settings.time.end", "settings.auto.next.preview.time"], // #DEFAULT: config privilege
    });
  }

  public override wire(): void {
    // Variables Assignment
    this.realStart = this.pseudoStart = this.config.start ?? 0;
    // State Listeners
    this.state.on("guardedPaths", this.handleGuardedPathsState, { init: true, signal: this.signal });
    // Ctlr Media Setters
    this.media.set("intent.currentTime", (v) => clamp(this.config.min, v, this.config.max), { signal: this.signal }); // #VALIDATOR: rules enforcement
    // ---- Config Watchers
    this.ctlr.config.watch("settings.time.start", (v) => v !== this.pseudoStart && (this.realStart = +v!), { signal: this.signal });
    // ---- Media Listeners
    this.media.on("status.loadedMetadata", this.handleLoadedMetadataStatus, { signal: this.signal }); // #TRANSIENT: only on change
    this.media.on("state.currentTime", this.handleCurrentTimeState, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.waiting", this.handleWaitingStatus, { signal: this.signal });
    // Post Wiring
    const keys = this.ctlr.plug("settings.keys");
    keys?.register("skipFwd", this.handleKeySkipFwd, { phase: "keydown" });
    keys?.register("skipBwd", this.handleKeySkipBwd, { phase: "keydown" });
    keys?.register("timeMode", this.toggleMode, { phase: "keyup" });
    keys?.register("timeFormat", this.rotateFormat, { phase: "keyup" });
  }

  protected handleGuardedPathsState({ value: paths = [] }: REvent<TimeState, "guardedPaths">): void {
    for (const path of paths) this.ctlr.config.get(path, this.toTimeVal, { signal: this.signal });
  }

  protected handleLoadedMetadataStatus({ value }: REvent<CtlrMedia, "status.loadedMetadata">): void {
    if (value && this.config.start != null) this.media.intent.currentTime = this.realStart;
  }

  protected handleCurrentTimeState({ value: curr }: REvent<CtlrMedia, "state.currentTime">): void {
    curr = safeNum(curr);
    if (curr < this.config.min || curr > this.config.max) {
      this.media.intent.currentTime = this.config.loop ? this.config.min : curr;
      if (!this.config.loop) this.media.intent.paused = true;
    }
    if (this.media.status.readyState && curr && this.ctlr.payload.wired) this.config.start = this.pseudoStart = curr > 3 && curr < (this.config.end ?? this.media.status.duration) - 3 ? curr : this.realStart;
  }

  protected handleWaitingStatus({ value }: REvent<CtlrMedia, "status.waiting">): void {
    value && IS_MOBILE && this.media.once("status.waiting", () => this.ctlr.plug("settings.overlay")?.[this.skipNotifier ? "remove" : "delay"](), { signal: this.signal });
  }

  public toTimeVal(value?: any): number {
    return parseIfPercent(value, this.media.status.duration);
  }
  public toTimeText(time = this.media.state.currentTime, useMode = false, showMs = false): string {
    if (!useMode || this.config.mode !== "remaining") return formatMediaTime({ time, format: this.config.format, elapsed: true, showMs });
    return formatMediaTime({ time: this.media.status.duration - time, format: this.config.format, elapsed: false, showMs });
  }

  public get nextMode(): CTime["mode"] {
    return this.config.mode === "elapsed" ? "remaining" : "elapsed";
  }
  public toggleMode(): void {
    this.config.mode = this.nextMode;
  }

  public get nextFormat(): CTime["format"] {
    return this.config.format === "digital" ? "human" : this.config.format === "human" ? "human-long" : "digital";
  }
  public rotateFormat(): void {
    this.config.format = this.nextFormat;
  }

  public skip(duration: number): void {
    const overlay = this.ctlr.plug("settings.overlay"),
      notifier = duration > 0 ? this.ctlr.plug("settings.notifiers")?.compEl("fwdnotifier") : this.ctlr.plug("settings.notifiers")?.compEl("bwdnotifier");
    duration = safeNum(duration > 0 ? (this.media.status.duration - this.media.state.currentTime > duration ? duration : this.media.status.duration - this.media.state.currentTime) : duration < 0 ? (this.media.state.currentTime > Math.abs(duration) ? duration : -this.media.state.currentTime) : 0);
    this.media.intent.currentTime = this.media.state.currentTime + duration; // Apprentice Slider syncs, no CSS hack
    // this.ctlr.settings.css.currentPlayedPosition = this.ctlr.settings.css.currentThumbPosition = safeNum(this.media.intent.currentTime / this.media.status.duration);
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
          plug.deactivateSkipPersist();
          notifier?.classList.remove("tmg-media-control-persist");
          this.skipDuration = 0;
          this.skipNotifier = null;
          !this.media.state.paused ? overlay?.remove() : overlay?.show();
        },
        parseCSSTime(this.ctlr.settings.css.notifiersAnimationTime),
        this.signal
      );
      return void notifier?.setAttribute("data-skip", String(Math.trunc(this.skipDuration)));
    } else this.skipNotifier?.classList.remove("tmg-media-control-persist");
    notifier?.setAttribute("data-skip", String(Math.trunc(Math.abs(duration))));
  }

  protected handleKeySkipFwd(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.deactivateSkipPersist();
    this.skip(this.ctlr.plug("settings.keys")!.getModded("skip", mod, this.config.skip));
    this.ctlr.plug("settings.notifiers")?.notify("fwd");
  }

  protected handleKeySkipBwd(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.deactivateSkipPersist();
    this.skip(-this.ctlr.plug("settings.keys")!.getModded("skip", mod, this.config.skip));
    this.ctlr.plug("settings.notifiers")?.notify("bwd");
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.time": typeof TimePlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    time: CTime;
  }
}

export type * from "./types";
export * from "./build";
