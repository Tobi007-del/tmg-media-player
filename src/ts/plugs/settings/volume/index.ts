import { BaseSliderPlug } from "@plugs/base/slider";
import type { VolumeConfig, VolumeState } from "./types";
import { VOLUME_BUILD } from "./build";
import type { Controller } from "@core/controller";
import { REvent, TERMINATOR } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { clamp } from "@utils/num";
import { AUDIO_CONTEXT, connectMediaToAudioManager } from "@tools/runtime";

export class VolumePlug extends BaseSliderPlug<VolumeConfig, VolumeState> {
  public static readonly plugName = "volume";
  public static readonly BUILD = VOLUME_BUILD;
  protected shadowVolume?: number;
  protected audioSetup = false;
  protected gainNode?: GainNode | null;
  protected get ctime(): number {
    return AUDIO_CONTEXT?.currentTime ?? 0;
  }
  protected get toggleKey() {
    return "muted" as const;
  }

  constructor(ctlr: Controller, config = ctlr.settings.volume) {
    super(ctlr, config, { aptValue: 0 });
    this.sliderAptValue = 5;
  }

  public override mount(): void {
    this.ctlr.state.audioContextReady ? this.connectAudio() : this.ctlr.state.once("audioContextReady", this.connectAudio, { signal: this.signal });
  }

  public override wire(): void {
    // Variables Assignment
    const volume = this.media.intent.volume ?? this.media.state.volume;
    this.state.aptValue = clamp(this.config.min, volume, this.config.max);
    this.shouldToggle = this.shouldSetAptValue = this.media.state.muted ?? false;
    this.media.intent.volume = this.shouldToggle ? 0 : this.state.aptValue;
    // Event Listeners
    this.media.element.addEventListener("volumechange", this.handleNativeVolumeChange, { capture: true, signal: this.signal }), this.handleNativeVolumeChange();
    // Ctlr Media Setters
    this.media.set("intent.volume", (v) => clamp(this.shouldToggle ? 0 : this.config.min, v, this.config.max), { signal: this.signal }); // #VALIDATOR: rules enforcement
    this.media.set("state.volume", (v) => (this.ctlr.isNativeEl && v !== this.shadowVolume ? TERMINATOR : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ----------- Watchers
    this.media.watch("tech", () => ((this.media.features.volume ||= this.ctlr.isNativeEl), (this.media.features.muted ||= this.ctlr.isNativeEl), (this.media.features.volumeBoost ||= this.ctlr.isNativeEl)), { init: true, signal: this.signal });
    // ----------- Listeners
    this.media.on("intent.volume", this.handleVolumeIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.muted", this.handleMutedIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.volume", (e) => this.handleSliderState(e.value), { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config ---------
    this.ctlr.config.on("settings.volume.min", (e) => this.handleMin(e.value), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.volume.max", (e) => this.handleMax(e.value), { init: true, signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("mute", { fn: this.handleKeyMute, keyboard: { phase: "keyup" } });
    this.ctlr.registerAction("volumeUp", { fn: this.handleKeyVolumeUp, keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("volumeDown", { fn: this.handleKeyVolumeDown, keyboard: { phase: "keydown" } });
    super.wire();
  }

  protected handleVolumeIntent(e: REvent<CtlrMedia, "intent.volume">, isNext = this.nextLevel === e.value): void {
    if (e.resolved) return;
    if (isNext) this.nextLevel = null;
    this.setValueState(e.value, isNext);
    this.ctlr.isNativeEl && this.gainNode?.gain.setTargetAtTime((e.value / 100) * 2, this.ctime, 0.05);
    if (!isNext && e.value > 0) this.media.settings.defaultMuted = false; // youtube courtesy
    if (this.ctlr.isNativeEl) this.media.state.volume = this.shadowVolume = e.value;
    // e.resolve(this.name); // #UMBRELLA: must envelope logic
  }

  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">, isNext = this.nextToggle === e.value): void {
    if (e.resolved) return;
    if (isNext) this.nextToggle = null;
    else if (this.media.state.muted === e.value && !!this.media.state.volume) return e.resolve(this.name);
    this.setToggleState(e.value, isNext);
    this.media.state.muted = e.value;
    // e.resolve(this.name); // #UMBRELLA: must envelope logic
  }

  protected handleKeyMute = (): void => {
    this.toggle("auto");
    this.media.features.volume && this.media.wonce("state.volume", (v) => this.ctlr.plug("settings.notifiers")?.notify(!v ? "volumemuted" : "volumeup"), { signal: this.signal });
  };
  protected handleKeyVolumeUp = (): void => {
    this.changeAptValue(this.ctlr.plug("settings.keys")?.getModded("volume", "", this.config.skip) ?? this.config.skip);
  };
  protected handleKeyVolumeDown = (): void => {
    this.changeAptValue(-(this.ctlr.plug("settings.keys")?.getModded("volume", "", this.config.skip) ?? this.config.skip));
  };

  protected handleNativeVolumeChange = (): void => {
    (this.media.element.volume = 1), this.ctlr.isNativeEl && this.media.state.muted !== this.media.element.muted && this.toggle(); // even advanced systems have edge cases
  };

  protected connectAudio(): void {
    if (this.audioSetup || connectMediaToAudioManager(this.media.element) === "unavailable") return;
    this.gainNode = this.media.element._tmgGainNode;
    const DCN = this.media.element._tmgDynamicsCompressorNode;
    if (DCN) (DCN.threshold.value = -30), (DCN.knee.value = 20), (DCN.ratio.value = 12), (DCN.attack.value = 0.003), (DCN.release.value = 0.25);
    this.audioSetup = true;
    if (this.ctlr.isNativeEl) this.gainNode?.gain.setTargetAtTime((this.media.state.volume / 100) * 2, this.ctime, 0.05);
  }
  protected disconnectAudio(): void {
    this.media.element.volume = clamp(0, ((this.gainNode?.gain?.value ?? 2) / 2) * 100, 1);
    this.media.element.mediaElementSourceNode?.disconnect(), this.gainNode?.disconnect();
    this.audioSetup = false;
  }

  protected override onDestroy(): void {
    this.disconnectAudio(), super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.volume": typeof VolumePlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    volume: VolumeConfig;
  }
}

declare module "@defs/contract" {
  interface MediaExtraFeatures {
    volumeBoost?: boolean;
  }
}
