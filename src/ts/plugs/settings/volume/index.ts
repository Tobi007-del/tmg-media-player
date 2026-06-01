import { BasePlug } from "../../base";
import type { KeyMod } from "../keys";
import type { Volume, VolumeState } from "./types";
import { VOLUME_BUILD } from "./build";
import type { Controller } from "@core/controller";
import { REvent, TERMINATOR } from "sia-reactor";
import type { CtlrConfig } from "@defs/config";
import type { CtlrMedia } from "@defs/contract";
import { clamp } from "@utils/num";
import { AUDIO_CONTEXT, connectMediaToAudioManager } from "@tools/runtime";

export class VolumePlug extends BasePlug<Volume, VolumeState> {
  public static readonly plugName = "volume";
  public static readonly BUILD = VOLUME_BUILD;
  protected shouldMute = false;
  protected sliderAptVolume = 5;
  protected shouldSetAptVolume = false;
  protected shadowVolume?: number;
  protected audioSetup = false;
  protected gainNode?: GainNode | null;
  protected get ctime(): number {
    return AUDIO_CONTEXT?.currentTime ?? 0;
  }

  constructor(ctlr: Controller, config: Volume = ctlr.config.settings.volume) {
    super(ctlr, config, { aptValue: 0 });
  }

  public override mount(): void {
    this.ctlr.state.audioContextReady ? this.setupAudio() : this.ctlr.state.once("audioContextReady", this.setupAudio, { signal: this.signal });
  }

  public override wire(): void {
    // Variables Assignment
    const volume = this.media.intent.volume ?? this.media.state.volume;
    this.state.aptValue = clamp(this.config.min, volume, this.config.max);
    this.shouldMute = this.shouldSetAptVolume = this.media.state.muted ?? false;
    this.media.intent.volume = this.shouldMute ? 0 : this.state.aptValue;
    // Event Listeners
    this.media.element.addEventListener("volumechange", this.handleVolumeChange, { signal: this.signal }), this.handleVolumeChange();
    // Ctlr Media Setters
    this.media.on("tech", () => (this.media.features.volume ||= this.media.features.muted = this.ctlr.isNativeTech), { init: true, signal: this.signal });
    this.media.set("intent.volume", (value) => clamp(this.config.min, value, this.config.max), { signal: this.signal }); // #VALIDATOR: rules enforcement
    this.media.set("state.volume", (v) => (this.ctlr.isNativeTech && v !== this.shadowVolume ? TERMINATOR : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ---- Media Listeners
    this.media.on("intent.volume", this.handleVolumeIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.muted", this.handleMutedIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.volume", this.handleVolumeState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.volume.min", this.handleMin, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.volume.max", this.handleMax, { init: true, signal: this.signal });
    // Post Wiring
    const keys = this.ctlr.plug("settings.keys");
    keys?.register("mute", this.handleKeyMute, { phase: "keyup" });
    keys?.register("volumeUp", this.handleKeyVolumeUp, { phase: "keydown" });
    keys?.register("volumeDown", this.handleKeyVolumeDown, { phase: "keydown" });
  }

  protected handleVolumeIntent(e: REvent<CtlrMedia, "intent.volume">): void {
    if (e.resolved || !this.ctlr.isNativeTech) return;
    this.setVolumeState(e.value);
    this.media.state.volume = this.shadowVolume = e.value;
    e.resolve(this.name);
  }

  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">): void {
    if (e.resolved || !this.ctlr.isNativeTech) return;
    if (this.media.state.muted === e.value && !!this.media.state.volume) return e.resolve(this.name);
    this.setMutedState(e.value);
    this.media.state.muted = this.media.element.muted = e.value; // gotta do the whole job
    e.resolve(this.name);
  }

  protected handleMin({ value: min }: REvent<CtlrConfig, "settings.volume.min">): void {
    if (this.media.state.volume < min) this.media.intent.volume = min;
    if (this.state.aptValue < min) this.state.aptValue = min;
  }

  protected handleMax({ value: max }: REvent<CtlrConfig, "settings.volume.max">): void {
    if (this.media.state.volume > max) this.media.intent.volume = max;
    if (this.state.aptValue > max) this.state.aptValue = max;
    this.media.container.classList.toggle("tmg-media-volume-boost", max > 100);
    this.ctlr.settings.css.volumeSliderPercent = Math.round((100 / max) * 100);
    this.ctlr.settings.css.maxVolumeRatio = max / 100;
  }

  protected handleVolumeState({ value: v }: REvent<CtlrMedia, "state.volume">): void {
    const vLevel = v === 0 ? "muted" : v < 50 ? "low" : v <= 100 ? "high" : "boost",
      vPercent = (v - 0) / (this.config.max - 0);
    this.media.container.dataset.volumeLevel = vLevel;
    if (this.config.max > 100) {
      if (v <= 100) {
        this.ctlr.settings.css.currentVolumeSliderPosition = (v - 0) / (100 - 0);
        this.ctlr.settings.css.currentVolumeSliderBoostPosition = 0;
        this.ctlr.settings.css.volumeSliderBoostPercent = 0;
      } else {
        this.ctlr.settings.css.currentVolumeSliderPosition = 1;
        this.ctlr.settings.css.currentVolumeSliderBoostPosition = (v - 100) / (this.config.max - 100);
        this.ctlr.settings.css.volumeSliderBoostPercent = this.ctlr.settings.css.volumeSliderPercent;
      }
    } else this.ctlr.settings.css.currentVolumeSliderPosition = vPercent;
  }

  protected setVolumeState(value: number): void {
    const v = clamp(this.shouldMute ? 0 : this.config.min, value, this.config.max);
    this.gainNode?.gain.setTargetAtTime((v / 100) * 2, this.ctime, 0.05);
    if (v > 0) this.media.settings.defaultMuted = this.media.intent.muted = false; // youtube courtesy
  } // #STANDALONE: needs scoped behavior

  protected setMutedState(muted: boolean): void {
    if (muted) {
      if (this.media.state.volume) {
        (this.state.aptValue = this.media.state.volume), (this.shouldSetAptVolume = true);
      }
      this.shouldMute = true;
      if (this.media.state.volume) this.media.intent.volume = 0;
    } else {
      const restore = this.shouldSetAptVolume ? this.state.aptValue : this.media.state.volume;
      this.media.intent.volume = restore ? restore : this.sliderAptVolume;
      this.shouldMute = this.shouldSetAptVolume = false;
    }
  } // #STANDALONE: needs scoped behavior

  public toggleMute(option?: "auto"): void {
    if (option === "auto" && this.shouldSetAptVolume && !this.state.aptValue) this.state.aptValue = this.config.skip;
    this.media.intent.muted = !(this.media.state.muted || !this.media.state.volume);
  }

  public changeAptValue(value: number): void {
    const sign = value >= 0 ? "+" : "-";
    value = Math.abs(value);
    let volume = this.shouldSetAptVolume ? this.state.aptValue : this.media.state.volume;
    if (sign === "-") {
      if (volume > this.config.min) volume -= volume % value || value;
      this.ctlr.plug("settings.notifiers")?.notify(volume === 0 ? "volumemuted" : "volumedown");
    } else {
      if (volume < this.config.max) volume += volume % value ? value - (volume % value) : value;
      this.ctlr.plug("settings.notifiers")?.notify("volumeup");
    }
    this.shouldSetAptVolume ? (this.state.aptValue = volume) : (this.media.intent.volume = volume);
  }

  protected setupAudio(): void {
    if (this.audioSetup || connectMediaToAudioManager(this.media.element) === "unavailable") return;
    this.gainNode = this.media.element._tmgGainNode;
    const DCN = this.media.element._tmgDynamicsCompressorNode;
    if (DCN) (DCN.threshold.value = -30), (DCN.knee.value = 20), (DCN.ratio.value = 12), (DCN.attack.value = 0.003), (DCN.release.value = 0.25);
    this.audioSetup = true;
    this.setVolumeState(this.media.state.volume);
  }

  protected cancelAudio(): void {
    this.media.intent.volume = clamp(this.config.min, ((this.gainNode?.gain?.value ?? 2) / 2) * 100, this.config.max);
    this.media.element.mediaElementSourceNode?.disconnect(), this.gainNode?.disconnect();
    this.audioSetup = false;
  }

  protected handleKeyMute(): void {
    this.toggleMute("auto");
    this.media.wonce("state.volume", (v) => this.ctlr.plug("settings.notifiers")?.notify(!v ? "volumemuted" : "volumeup"), { signal: this.signal });
  }
  protected handleKeyVolumeUp(_: KeyboardEvent, mod: KeyMod): void {
    this.changeAptValue(this.ctlr.plug("settings.keys")!.getModded("volume", mod, this.config.skip));
  }
  protected handleKeyVolumeDown(_: KeyboardEvent, mod: KeyMod): void {
    this.changeAptValue(-this.ctlr.plug("settings.keys")!.getModded("volume", mod, this.config.skip));
  }

  public handleSliderInput(volume: number): void {
    this.shouldMute = this.shouldSetAptVolume = false;
    this.media.intent.volume = volume;
    if (volume > 5) this.sliderAptVolume = volume;
  }

  protected handleVolumeChange(): void {
    this.ctlr.isNativeTech && (this.media.element.volume = 1); // even advanced systems have edge cases
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.volume": typeof VolumePlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    volume: Volume;
  }
}

export type * from "./types";
export * from "./build";
