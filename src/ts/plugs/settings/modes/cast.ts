import { BasePin } from "../../base";
import { type REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { loadResource } from "@utils/dom";
import { ComponentRegistry } from "@core/registries";
import { silence } from "sia-reactor/modules";
import { CastPlaceholder } from "@components/holders/castPlaceholder";
import { getMimeTypeFromExtension } from "@utils/file";
import { MODES_CAST_BUILD, ModesPlug } from "./index";
import { ModesCastConfig, ModesCastState } from "./types";
import { Controller } from "@core/controller";

export class ModesCastPin extends BasePin<ModesPlug, ModesCastConfig, ModesCastState> {
  public static readonly pinName = "cast";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_CAST_BUILD;
  public ctx: cast.framework.CastContext | null = null;
  public remotePlyr: cast.framework.RemotePlayer | null = null;
  public remoteCtlr: cast.framework.RemotePlayerController | null = null;
  protected placeholder: CastPlaceholder | null = null;

  constructor(ctlr: Controller, config = ctlr.settings.modes.cast) {
    super(ctlr, config, { APIReady: false });
  }

  protected async initAPI(): Promise<void> {
    if (this.state.APIReady || location.protocol === "file:") return;
    try {
      if ("undefined" === typeof cast) {
        const prev = (window as any).__onGCastApiAvailable;
        ((window as any).__onGCastApiAvailable = (can: boolean) => (prev?.(can), can && "cast" in window && this.setupAPi())), await loadResource(window.TMG_CAST_API_SRC!, "script");
      } else this.setupAPi();
    } catch (err) {
      this.ctlr.log(err, "error", true); // #LESS: error not worth notifying
    }
  }

  public override wire(): void {
    // State Watchers
    this.state.watch("APIReady", this.syncFeatures, { signal: this.signal });
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal }); // no YT or Vimeo until d custom client
    // ---- Config -------
    this.ctlr.config.watch("settings.modes.cast.disabled", this.syncFeatures, { signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.cast", this.handleCastIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal });
    this.media.on("intent.paused", this.handlePausedIntent, { capture: true, signal: this.signal });
    this.media.on("intent.currentTime", this.handleCurrentTimeIntent, { capture: true, signal: this.signal });
    this.media.on("intent.volume", this.handleVolumeIntent, { capture: true, signal: this.signal });
    this.media.on("intent.muted", this.handleMutedIntent, { capture: true, signal: this.signal });
    // Post Wiring
    this.ctlr.learn("cast", undefined, this.signal);
  }

  protected handleCastIntent(e: REvent<CtlrMedia, "intent.cast">): void {
    if (e.resolved) return;
    const active = this.ctlr.isUIActive("cast");
    if (e.value && !active) {
      this.ctlr.plug("settings.metadata")?.syncSession();
      this.ctx!.requestSession().then(this.loadMediaSession).catch(this.ctlr.notice);
      this.ctlr.plug("settings.notifiers")?.notify("cast"); // #STALLING: necessary optimistic distraction
    } else if (!e.value && active) {
      this.ctx!.endCurrentSession(true);
      this.media.container.classList.remove("tmg-media-cast");
      this.media.state.cast = false;
    }
    e.resolve(this.name);
  }

  protected handlePausedIntent(e: REvent<CtlrMedia, "intent.paused">): void {
    if (e.resolved || !this.media.state.cast) return;
    e.value !== this.remotePlyr!.isPaused && this.remoteCtlr!.playOrPause();
    e.resolve(this.name);
  }

  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    if (e.resolved || !this.media.state.cast) return;
    this.remotePlyr!.currentTime = e.value;
    this.remoteCtlr!.seek();
    e.resolve(this.name);
  }

  protected handleVolumeIntent(e: REvent<CtlrMedia, "intent.volume">): void {
    if (e.resolved || !this.media.state.cast) return;
    this.remotePlyr!.volumeLevel = e.value / 100;
    this.remoteCtlr!.setVolumeLevel();
    e.resolve(this.name);
  }

  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">): void {
    if (e.resolved || !this.media.state.cast) return;
    this.remotePlyr!.isMuted !== e.value && this.remoteCtlr!.muteOrUnmute();
    e.resolve(this.name);
  }

  protected setupAPi(): void {
    if (this.state.APIReady || !chrome?.cast) return;
    this.ctx = cast.framework.CastContext.getInstance();
    this.ctx.setOptions(Object.assign({ receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID, autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED }, this.config.options));
    this.ctx.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, this.syncFeatures);
    this.remotePlyr = new cast.framework.RemotePlayer();
    this.remoteCtlr = new cast.framework.RemotePlayerController(this.remotePlyr);
    this.remoteCtlr.addEventListener(cast.framework.RemotePlayerEventType.ANY_CHANGE, this.syncRemoteState);
    this.state.APIReady = true;
  }

  protected async loadMediaSession(): Promise<void> {
    const session = cast.framework.CastContext.getInstance().getCurrentSession();
    if (!session) return;
    silence(() => (this.media.intent.paused = true)); // pause local playback to avoid double audio
    this.placeholder ??= ComponentRegistry.init("castPlaceholder", this.ctlr);
    const textEl = this.placeholder?.el.querySelector("p"),
      request = new chrome.cast.media.LoadRequest(new chrome.cast.media.MediaInfo(this.media.state.src, getMimeTypeFromExtension(this.media.state.src)));
    if (textEl) textEl.textContent = `Casting to ${session.getCastDevice().friendlyName || "External display"}`;
    await session.loadMedia(((request.currentTime = this.media.state.currentTime), request));
    this.media.container.classList.add("tmg-media-cast"), this.ctlr.log(`${this.ctlr.config.id} Casting -> ${this.media}`); // dev
    this.media.state.cast = true;
  } // #STANDALONE: needs scoped behavior

  protected syncRemoteState({ field }: cast.framework.RemotePlayerChangedEvent): void {
    if (!(this.media.state.cast = this.remotePlyr!.isConnected)) return;
    switch (field) {
      case "currentTime":
        return void (this.media.state.currentTime = this.remotePlyr![field]);
      case "isPaused":
        return void (this.media.state.paused = this.remotePlyr![field]);
      case "volumeLevel":
        return void (this.media.state.volume = this.remotePlyr![field] * 100);
      case "isMuted":
        return void (this.media.state.muted = this.remotePlyr![field]);
      case "duration":
        return void (this.media.status.duration = this.remotePlyr![field]);
    }
  }

  public syncFeatures(): void {
    if (!this.config.disabled && this.ctlr.isNativeEl) this.ctlr.flags.wired ? this.initAPI() : this.ctlr.state.wonce("readyState", this.initAPI, { signal: this.signal }); // #HEAVY: waits for !lightState
    this.media.tech.polyfill("cast", this.ctlr.isNativeEl && this.state.APIReady && this.ctx!.getCastState() !== cast.framework.CastState.NO_DEVICES_AVAILABLE, this.config.disabled);
  }

  protected override onDestroy(): void {
    this.media.state.cast && this.ctx!.endCurrentSession(true);
    this.ctx?.removeEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, this.syncFeatures);
    this.remoteCtlr?.removeEventListener(cast.framework.RemotePlayerEventType.ANY_CHANGE, this.syncRemoteState);
    this.placeholder?.destroy(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.cast": typeof ModesCastPin;
  }
}
