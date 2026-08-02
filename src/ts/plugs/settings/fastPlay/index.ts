import { silence } from "sia-reactor/modules";
import { BasePlug } from "../../base";
import { FAST_PLAY_BUILD } from "./build";
import type { FastPlayConfig, FastPlayState } from "./types";
import type { Controller } from "@core/controller";
import { setTimeout, setInterval } from "@utils/fn";

export class FastPlayPlug extends BasePlug<FastPlayConfig, FastPlayState> {
  public static readonly plugName = "fastPlay";
  public static readonly BUILD = FAST_PLAY_BUILD;
  public speedCheck = false;
  public speedPtrCheck = false;
  protected wasPaused = false;
  protected prevRate = 1;
  protected rewindRate = 0;
  protected speedIntervalId: number | null = null;
  protected speedDirection: "forwards" | "backwards" = "forwards";
  protected speedTimeoutId: number | null = null;

  constructor(ctlr: Controller, config = ctlr.settings.fastPlay) {
    super(ctlr, config, { isRewinding: false });
  }

  public override wire(): void {
    const run = () => this.ctlr.DOM.controlsContainer?.addEventListener("pointerdown", this.handleSpeedPointerDown, { capture: true, signal: this.signal });
    this.ctlr.payload.wired ? run() : this.ctlr.state.wonce("readyState", run, { signal: this.signal }); // #HEAVY: waits for !lightState
    // Post Wiring
    super.wire();
  }

  public fastPlay(pos: "forwards" | "backwards"): void {
    if (this.speedCheck) return;
    this.speedCheck = true;
    this.wasPaused = this.media.state.paused;
    this.prevRate = this.media.state.playbackRate;
    this.ctlr.plug("settings.notifiers")?.comp("fastplaynotifier")?.active();
    setTimeout(pos === "backwards" && this.config.rewind ? this.rewind : this.fastForward, 0, this.signal);
  }

  public fastForward(rate = this.config.playbackRate): void {
    silence(() => (this.media.intent.playbackRate = rate));
    this.state.isRewinding = false;
    this.ctlr.plug("settings.notifiers")?.compEl("fastplaynotifier")?.classList.remove("tmg-media-rewind");
    silence(() => (this.media.intent.paused = false));
  }

  public rewind(rate = this.config.playbackRate): void {
    silence(() => (this.media.intent.playbackRate = 1));
    this.rewindRate = rate;
    this.state.isRewinding = true;
    this.ctlr.plug("settings.notifiers")?.compEl("fastplaynotifier")?.classList.add("tmg-media-rewind");
    this.media.on("state.paused", this.rewindReset, { signal: this.signal });
    this.speedIntervalId = setInterval(this.rewindMedia, Math.round(1000 / this.settings.frame.fps) - 18, this.signal); // intervals lag nd i'm 18 now so, yeah!
  }

  protected rewindMedia(): void {
    const textEl = this.ctlr.plug("settings.notifiers")?.comp("fastplaynotifier")?.text;
    if (textEl) textEl.textContent = `${this.rewindRate}x`;
    if (!this.media.state.paused) silence(() => (this.media.intent.paused = true));
    silence(() => (this.media.intent.currentTime = this.media.state.currentTime - this.rewindRate / this.settings.frame.fps)); // Apprentice Slider syncs, no CSS hack
    // this.settings.css.currentPlayedPosition = this.settings.css.currentThumbPosition = this.media.state.currentTime / this.media.status.duration; // #REBORN: old things have passed away
  }

  protected rewindReset(): void {
    if (this.media.state.paused) return;
    if (this.speedIntervalId) {
      this.ctlr.plug("settings.notifiers")?.notify("mediapause");
      silence(() => (this.media.intent.paused = true));
      clearInterval(this.speedIntervalId);
      this.speedIntervalId = null;
    } else this.speedIntervalId ??= setInterval(this.rewindMedia, Math.round(1000 / this.settings.frame.fps) - 18, this.signal);
  }

  public slowDown(): void {
    if (!this.speedCheck) return;
    this.speedCheck = false;
    if (this.speedIntervalId) clearInterval(this.speedIntervalId);
    this.media.off("state.paused", this.rewindReset);
    silence(() => (this.media.intent.playbackRate = this.prevRate));
    this.rewindRate = 0;
    this.state.isRewinding = false;
    silence(() => (this.media.intent.paused = this.config.resetPaused ? this.wasPaused : false));
    this.ctlr.plug("settings.overlay")?.hide();
    this.ctlr.plug("settings.notifiers")?.compEl("fastplaynotifier")?.classList.remove("tmg-media-control-active", "tmg-media-rewind");
    this.media.tick(["intent.playbackRate", "intent.paused"]);
  }

  protected handleSpeedPointerDown(e: PointerEvent): void {
    if (!new RegExp(`all|${e.pointerType}`).test(this.config.pointer.type.value) || e.target !== this.ctlr.DOM.controlsContainer || this.ctlr.isUIActive("miniplayer") || this.speedCheck) return;
    for (const evt of ["touchmove", "mouseup", "touchend", "touchcancel"]) this.media.container?.addEventListener(evt, this.handleSpeedPointerUp, { signal: this.signal });
    this.media.container?.addEventListener("mouseleave", this.handleSpeedPointerOut, { signal: this.signal });
    clearTimeout(this.speedTimeoutId!);
    this.speedTimeoutId = setTimeout(
      () => {
        this.media.container?.removeEventListener("touchmove", this.handleSpeedPointerUp);
        this.speedPtrCheck = true;
        const x = e.clientX ?? (e as unknown as TouchEvent).targetTouches?.[0]?.clientX;
        const rect = this.media.container.getBoundingClientRect();
        const rLeft = x - rect.left;
        this.speedDirection = rLeft >= rect.width * 0.5 ? "forwards" : "backwards";
        if (rLeft < this.config.pointer.inset || rLeft > rect.width - this.config.pointer.inset) return;
        if (this.config.rewind) for (const evt of ["mousemove", "touchmove"]) this.media.container?.addEventListener(evt, this.handleSpeedPointerMove, { signal: this.signal });
        this.fastPlay(this.speedDirection);
      },
      this.config.pointer.threshold,
      this.signal
    );
  }

  protected handleSpeedPointerMove(e: globalThis.Event): void {
    if ((e as TouchEvent).touches?.length > 1) return;
    this.ctlr.throttle(
      "speedPointerMove",
      () => {
        const rect = this.media.container.getBoundingClientRect(),
          x = (e as MouseEvent).clientX ?? (e as TouchEvent).targetTouches?.[0]?.clientX,
          currPos = x - rect.left >= rect.width * 0.5 ? "forwards" : "backwards";
        if (currPos !== this.speedDirection) (this.speedDirection = currPos), this.slowDown(), this.fastPlay(this.speedDirection);
      },
      200
    );
  }

  protected handleSpeedPointerUp(): void {
    clearTimeout(this.speedTimeoutId!);
    this.speedPtrCheck = false;
    if (this.speedCheck && (this.ctlr.plug("settings.keys")?.playTriggerSeq ?? 0) < 1) setTimeout(this.slowDown, 350, this.signal); // safe dbl clicks need 300ms wait for singles
    for (const evt of ["touchmove", "mouseup", "touchend", "touchcancel"]) this.media.container?.removeEventListener(evt, this.handleSpeedPointerUp);
    for (const evt of ["mousemove", "touchmove"]) this.media.container?.removeEventListener(evt, this.handleSpeedPointerMove);
    this.media.container?.removeEventListener("mouseleave", this.handleSpeedPointerOut);
  }

  protected handleSpeedPointerOut(): void {
    !this.media.container?.matches(":hover") && this.handleSpeedPointerUp();
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.fastPlay": typeof FastPlayPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    fastPlay: FastPlayConfig;
  }
}

export type * from "./types";
export * from "./build";
