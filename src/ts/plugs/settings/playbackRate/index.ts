import { BasePlug } from "../../base";
import type { KeyMod } from "../keys";
import type { PlaybackRate } from "./types";
import { PLAYBACK_RATE_BUILD } from "./build";
import type { REvent } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import type { CtlrMedia } from "@defs/contract";
import { clamp, rotateAny } from "@utils/num";

export class PlaybackRatePlug extends BasePlug<PlaybackRate> {
  public static readonly plugName = "playbackRate";
  public static readonly BUILD = PLAYBACK_RATE_BUILD;

  public override wire(): void {
    // Ctlr Media Setters
    this.media.set("intent.playbackRate", (value) => clamp(this.config.min, value!, this.config.max), { signal: this.signal }); // #VALIDATOR: rules enforcement
    // ---- Media Listeners
    this.media.on("state.playbackRate", this.handlePlaybackRateState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.playbackRate.min", this.handleMin, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.playbackRate.max", this.handleMax, { init: true, signal: this.signal });
    // Post Wiring
    const keys = this.ctlr.plug("settings.keys");
    keys?.register("playbackRateUp", this.handleKeyRateUp, { phase: "keydown" });
    keys?.register("playbackRateDown", this.handleKeyRateDown, { phase: "keydown" });
  }

  protected handleMin({ value: min }: REvent<CtlrConfig, "settings.playbackRate.min">): void {
    if (this.media.state.playbackRate < min) this.media.intent.playbackRate = min;
  }

  protected handleMax({ value: max }: REvent<CtlrConfig, "settings.playbackRate.max">): void {
    if (this.media.state.playbackRate > max) this.media.intent.playbackRate = max;
  }

  protected handlePlaybackRateState({ value }: REvent<CtlrMedia, "state.playbackRate">): void {
    this.media.settings.defaultPlaybackRate = value; // UX boost
  }

  protected handleKeyRateUp(_: KeyboardEvent, mod: KeyMod): void {
    this.changeValue(this.ctlr.plug("settings.keys")!.getModded("playbackRate", mod, this.config.skip));
  }
  protected handleKeyRateDown(_: KeyboardEvent, mod: KeyMod): void {
    this.changeValue(-this.ctlr.plug("settings.keys")!.getModded("playbackRate", mod, this.config.skip));
  }

  public rotateRate(dir: "forwards" | "backwards" = "forwards"): void {
    this.media.intent.playbackRate = rotateAny(this.media.state.playbackRate, { min: this.config.min, max: this.config.max, step: this.config.skip }, dir);
  }

  public changeValue(value: number): void {
    const sign = value >= 0 ? "+" : "-";
    value = Math.abs(value);
    const rate = this.media.state.playbackRate;
    if (sign === "-") {
      if (rate > this.config.min) this.media.intent.playbackRate = rate - (rate % value || value);
      this.ctlr.plug("settings.notifiers")?.notify("playbackratedown");
    } else {
      if (rate < this.config.max) this.media.intent.playbackRate = rate + (rate % value ? value - (rate % value) : value);
      this.ctlr.plug("settings.notifiers")?.notify("playbackrateup");
    }
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.playbackRate": typeof PlaybackRatePlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    playbackRate: PlaybackRate;
  }
}
