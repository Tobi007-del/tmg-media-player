import { BasePlug } from "../../base";
import type { PlaybackRateConfig } from "./types";
import { PLAYBACK_RATE_BUILD } from "./build";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { clamp, rotateAny } from "@utils/num";
import { KeyMod } from "../keys";

export class PlaybackRatePlug extends BasePlug<PlaybackRateConfig> {
  public static readonly plugName = "playbackRate";
  public static readonly BUILD = PLAYBACK_RATE_BUILD;

  public override wire(): void {
    // Ctlr Media Setters
    this.media.set("intent.playbackRate", (value) => clamp(this.config.min, value!, this.config.max), { signal: this.signal }); // #VALIDATOR: rules enforcement
    // ---- Media Listeners
    this.media.on("state.playbackRate", this.handlePlaybackRateState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.playbackRate.min", ({ value }) => this.media.state.playbackRate < value && (this.media.intent.playbackRate = value), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.playbackRate.max", ({ value }) => this.media.state.playbackRate > value && (this.media.intent.playbackRate = value), { init: true, signal: this.signal });
    // Post Wiring
    this.ctlr.addAction("playbackRateUp", { fn: this.handleKeyRateUp, keyboard: { phase: "keydown" } }, this.signal), this.ctlr.addAction("playbackRateDown", { fn: this.handleKeyRateDown, keyboard: { phase: "keydown" } }, this.signal);
    super.wire();
  }

  protected handlePlaybackRateState({ value }: REvent<CtlrMedia, "state.playbackRate">): void {
    this.media.settings.defaultPlaybackRate = value; // UX boost
  }

  protected handleKeyRateUp(_: KeyboardEvent, mod: KeyMod): void {
    this.changeValue(this.ctlr.plug("settings.keys")?.getModded("playbackRate", mod, this.config.skip) ?? this.config.skip);
  }
  protected handleKeyRateDown(_: KeyboardEvent, mod: KeyMod): void {
    this.changeValue(-(this.ctlr.plug("settings.keys")?.getModded("playbackRate", mod, this.config.skip) ?? this.config.skip));
  }

  public rotateRate(dir: "forwards" | "backwards" = "forwards"): void {
    this.media.intent.playbackRate = rotateAny(this.media.state.playbackRate, { min: this.config.min, max: this.config.max, step: this.config.skip }, dir);
  }

  public changeValue(value: number): void {
    const sign = value >= 0 ? "+" : "-";
    value = Math.abs(Math.round(value * 100));
    let rate = Math.round(this.media.state.playbackRate * 100);
    if (sign === "-") {
      if (rate > this.config.min * 100) rate -= rate % value || value;
      this.media.features.playbackRate && this.ctlr.plug("settings.notifiers")?.notify("playbackRateDown");
    } else {
      if (rate < this.config.max * 100) rate += rate % value ? value - (rate % value) : value;
      this.media.features.playbackRate && this.ctlr.plug("settings.notifiers")?.notify("playbackRateUp");
    }
    this.media.intent.playbackRate = clamp(this.config.min, +(rate / 100).toFixed(2), this.config.max);
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
    playbackRate: PlaybackRateConfig;
  }
}
