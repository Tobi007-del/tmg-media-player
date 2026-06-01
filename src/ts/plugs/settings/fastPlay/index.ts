import { BasePlug } from "../../base";
import { FAST_PLAY_BUILD } from "./build";
import type { FastPlay, FastPlayState } from "./types";
import type { Controller } from "@core/controller";
import { setTimeout, setInterval } from "@utils/fn";

export class FastPlayPlug extends BasePlug<FastPlay, FastPlayState> {
  public static readonly plugName = "fastPlay";
  public static readonly BUILD = FAST_PLAY_BUILD;
  public speedCheck = false;
  protected wasPaused = false;
  protected prevPlaybackRate = 1;
  protected rewindbackRate = 0;
  protected speedIntervalId: number | null = null;
  protected speedPtrCheck = false;
  protected speedDirection: "forwards" | "backwards" = "forwards";
  protected speedTimeoutId: number | null = null;
  protected playTriggerCounter = 0;

  constructor(ctlr: Controller, config: FastPlay = ctlr.config.settings.fastPlay) {
    super(ctlr, config, { isRewinding: false });
  }

  public override wire(): void {
    const run = () => {
      // Event Listeners
      this.ctlr.DOM.controlsContainer?.addEventListener("pointerdown", this.handleSpeedPointerDown, { capture: true, signal: this.signal });
    };
    this.ctlr.payload.wired ? run() : this.ctlr.state.wonce("readyState", run, { signal: this.signal });
  }

  public fastPlay(pos: "forwards" | "backwards"): void {
    if (this.speedCheck) return;
    this.speedCheck = true;
    this.wasPaused = this.media.state.paused;
    this.prevPlaybackRate = this.media.state.playbackRate;
    this.ctlr.plug("settings.notifiers")?.comp("fastplaynotifier")?.active();
    setTimeout(pos === "backwards" && this.config.rewind ? this.rewind : this.fastForward, 0, this.signal);
  }

  public fastForward(rate = this.config.playbackRate): void {
    this.media.intent.playbackRate = rate;
    this.state.isRewinding = false;
    this.ctlr.plug("settings.notifiers")?.compEl("fastplaynotifier")?.classList.remove("tmg-media-rewind");
    this.media.intent.paused = false;
  }

  public rewind(rate = this.config.playbackRate): void {
    (this.media.intent.playbackRate = 1), (this.rewindbackRate = rate);
    this.state.isRewinding = true;
    this.ctlr.plug("settings.notifiers")?.compEl("fastplaynotifier")?.classList.add("tmg-media-rewind");
    this.media.on("state.paused", this.rewindReset, { signal: this.signal });
    this.speedIntervalId = setInterval(this.rewindMedia, Math.round(1000 / this.ctlr.settings.frame.fps) - 18, this.signal); // intervals lag nd i'm 18 now so, yeah!
  }

  protected rewindMedia(): void {
    const textEl = this.ctlr.plug("settings.notifiers")?.comp("fastplaynotifier")?.text;
    if (textEl) textEl.textContent = `${this.rewindbackRate}x`;
    if (!this.media.state.paused) this.media.intent.paused = true;
    this.media.intent.currentTime = this.media.state.currentTime - this.rewindbackRate / this.ctlr.settings.frame.fps; // Apprentice Slider syncs, no CSS hack
    // this.ctlr.settings.css.currentPlayedPosition = this.ctlr.settings.css.currentThumbPosition = this.media.state.currentTime / this.media.status.duration;
  }

  protected rewindReset(): void {
    if (this.speedIntervalId && !this.media.state.paused) {
      this.ctlr.plug("settings.notifiers")?.notify("mediapause");
      this.media.intent.paused = true;
      clearInterval(this.speedIntervalId);
      this.speedIntervalId = null;
    } else this.speedIntervalId ??= setInterval(this.rewindMedia, Math.round(1000 / this.ctlr.settings.frame.fps) - 18, this.signal);
  }

  public slowDown(): void {
    if (!this.speedCheck) return;
    this.speedCheck = false;
    if (this.speedIntervalId) clearInterval(this.speedIntervalId);
    this.media.off("state.paused", this.rewindReset);
    this.media.intent.playbackRate = this.prevPlaybackRate;
    this.rewindbackRate = 0;
    this.state.isRewinding = false;
    this.media.intent.paused = this.config.reset ? this.wasPaused : false;
    this.ctlr.plug("settings.overlay")?.remove();
    this.ctlr.plug("settings.notifiers")?.compEl("fastplaynotifier")?.classList.remove("tmg-media-control-active", "tmg-media-rewind");
  }

  protected handleSpeedPointerDown(e: PointerEvent): void {
    if (!this.config.pointer.type.match(new RegExp(`all|${e.pointerType}`)) || e.target !== this.ctlr.DOM.controlsContainer || this.speedCheck) return;
    ["touchmove", "mouseup", "touchend", "touchcancel"].forEach((evt) => this.media.container?.addEventListener(evt, this.handleSpeedPointerUp, { signal: this.signal }));
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
        if (this.config.rewind) ["mousemove", "touchmove"].forEach((evt) => this.media.container?.addEventListener(evt, this.handleSpeedPointerMove, { signal: this.signal }));
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
    if (this.speedCheck && this.playTriggerCounter < 1) setTimeout(this.slowDown, 350, this.signal); // safe dbl clicks need 300ms wait for singles
    ["touchmove", "mouseup", "touchend", "touchcancel"].forEach((evt) => this.media.container?.removeEventListener(evt, this.handleSpeedPointerUp));
    ["mousemove", "touchmove"].forEach((evt) => this.media.container?.removeEventListener(evt, this.handleSpeedPointerMove));
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
    fastPlay: FastPlay;
  }
}

export type * from "./types";
export * from "./build";
