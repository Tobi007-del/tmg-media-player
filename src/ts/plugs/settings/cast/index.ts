import { BasePlug } from "../../base";
import { type REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { loadResource } from "@utils/dom";
import { CastConfig } from "./types";
import { CAST_BUILD } from "./build";
import { ComponentRegistry } from "@core/registries";
import { silence } from "sia-reactor/modules";
import { CastPlaceholder } from "@components/holders/castplaceholder";
import { getMimeTypeFromExtension } from "@utils/file";

export class CastPlug extends BasePlug<CastConfig> {
  public static readonly plugName = "cast";
  public static readonly BUILD = CAST_BUILD;
  public remotePlayer: cast.framework.RemotePlayer | null = null;
  public remoteController: cast.framework.RemotePlayerController | null = null;
  public apiSetup = false;
  protected placeholder: CastPlaceholder | null = null;

  public override mount(): void {
    this.ctlr.payload.wired ? this.initApi() : this.ctlr.state.wonce("readyState", this.initApi, { signal: this.signal }); // #HEAVY: waits for !lightState
  }
  protected async initApi(): Promise<void> {
    try {
      if (this.apiSetup) return;
      if (typeof cast === "undefined") {
        const prev = (window as any).__onGCastApiAvailable;
        ((window as any).__onGCastApiAvailable = (can: boolean) => (prev?.(can), can && "cast" in window && this.setupApi())), await loadResource(window.TMG_CAST_SENDER_SRC!, "script");
      } else this.setupApi();
    } catch (err) {
      this.ctlr.log(err, "error", true); // #LESS: error not worth notifying
    }
  }

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", () => (this.media.features.cast ||= this.ctlr.isNativeEl && this.apiSetup), { init: true, signal: this.signal }); // no YT or Vimeo until d custom client
    // --------- Listeners
    this.media.on("intent.cast", this.handleCastIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal });
    this.media.on("intent.paused", this.handlePausedIntent, { capture: true, signal: this.signal });
    this.media.on("intent.currentTime", this.handleCurrentTimeIntent, { capture: true, signal: this.signal });
    this.media.on("intent.volume", this.handleVolumeIntent, { capture: true, signal: this.signal });
    this.media.on("intent.muted", this.handleMutedIntent, { capture: true, signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("cast", { fn: () => (this.media.intent.cast = !this.media.state.cast), keyboard: { phase: "keyup" } }), super.wire();
  }

  protected handleCastIntent(e: REvent<CtlrMedia, "intent.cast">): void {
    if (e.resolved || !this.apiSetup) return;
    const context = cast.framework.CastContext.getInstance(),
      active = this.ctlr.isUIActive("cast");
    if (e.value && !active) {
      this.ctlr.plug("settings.metadata")?.syncSession();
      context.requestSession().then(this.loadMediaSession).catch(this.ctlr.notice);
      this.ctlr.plug("settings.notifiers")?.notify("cast"); // #STALLING: necessary optimistic distraction
    } else if (!e.value && active) {
      context.endCurrentSession(true);
      this.media.container.classList.remove("tmg-media-cast");
      this.media.state.cast = false;
    }
    e.resolve(this.name);
  }

  protected handlePausedIntent(e: REvent<CtlrMedia, "intent.paused">): void {
    if (!this.media.state.cast || e.resolved) return;
    if (e.value !== this.remotePlayer!.isPaused) this.remoteController!.playOrPause();
    e.resolve(this.name);
  }

  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    if (!this.media.state.cast || e.resolved) return;
    this.remotePlayer!.currentTime = e.value;
    this.remoteController!.seek();
    e.resolve(this.name);
  }

  protected handleVolumeIntent(e: REvent<CtlrMedia, "intent.volume">): void {
    if (!this.media.state.cast || e.resolved) return;
    this.remotePlayer!.volumeLevel = e.value / 100;
    this.remoteController!.setVolumeLevel();
    e.resolve(this.name);
  }

  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">): void {
    if (!this.media.state.cast || e.resolved) return;
    if (this.remotePlayer!.isMuted !== e.value) this.remoteController!.muteOrUnmute();
    e.resolve(this.name);
  }

  protected setupApi(): void {
    if (!chrome.cast) return;
    const context = cast.framework.CastContext.getInstance();
    context.setOptions({ receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID, autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED, ...this.config.options });
    this.remotePlayer = new cast.framework.RemotePlayer();
    this.remoteController = new cast.framework.RemotePlayerController(this.remotePlayer);
    this.remoteController.addEventListener(cast.framework.RemotePlayerEventType.ANY_CHANGE, this.syncRemoteState);
    (this.placeholder = ComponentRegistry.init("castplaceholder", this.ctlr))?.setup();
    (this.apiSetup = true), (this.media.features.cast ||= this.ctlr.isNativeEl && this.apiSetup); // Unlock the feature UI
  }

  protected async loadMediaSession(): Promise<void> {
    const session = cast.framework.CastContext.getInstance().getCurrentSession();
    if (!session) return;
    silence(() => (this.media.intent.paused = true)); // pause local playback to avoid double audio
    const textEl = this.placeholder?.el.querySelector("p"),
      request = new chrome.cast.media.LoadRequest(new chrome.cast.media.MediaInfo(this.media.state.src, getMimeTypeFromExtension(this.media.state.src)));
    request.currentTime = this.media.state.currentTime;
    await session.loadMedia(request);
    if (textEl) textEl.textContent = `Casting to ${session.getCastDevice().friendlyName || "External Display"}`;
    this.media.container.classList.add("tmg-media-cast");
    this.media.state.cast = true;
    // console.log("Media loaded to TV", this.media.state.src, this.media.state.currentTime); // dev
  } // #STANDALONE: needs scoped behavior

  protected syncRemoteState(event: cast.framework.RemotePlayerChangedEvent): void {
    const isConnected = this.remotePlayer!.isConnected;
    if (this.media.state.cast !== isConnected) this.media.state.cast = isConnected;
    if (!isConnected) return;
    switch (event.field) {
      case "currentTime":
        return void (this.media.state.currentTime = this.remotePlayer!.currentTime);
      case "isPaused":
        return void (this.media.state.paused = this.remotePlayer!.isPaused);
      case "volumeLevel":
        return void (this.media.state.volume = this.remotePlayer!.volumeLevel * 100);
      case "isMuted":
        return void (this.media.state.muted = this.remotePlayer!.isMuted);
      case "duration":
        return void (this.media.status.duration = this.remotePlayer!.duration);
    }
  }

  protected override onDestroy(): void {
    this.remoteController?.removeEventListener(cast.framework.RemotePlayerEventType.ANY_CHANGE, this.syncRemoteState);
    this.media.state.cast && cast.framework.CastContext.getInstance().endCurrentSession(true);
    this.placeholder?.destroy(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.cast": typeof CastPlug;
  }
}
