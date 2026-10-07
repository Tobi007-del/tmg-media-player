import { silence } from "sia-reactor/modules";
import { BasePlug } from "../../base";
import { FAST_PLAY_BUILD } from "./build";
import type { FastPlayConfig, FastPlayState } from "./types";
import type { Controller } from "@core/controller";
import { setTimeout, setInterval } from "@utils/fn";
import { REvent } from "sia-reactor";
import { CtlrMedia } from "@defs/contract";

export class FastPlayPlug extends BasePlug<FastPlayConfig, FastPlayState> {
  public static readonly plugName = "fastPlay";
  public static readonly BUILD = FAST_PLAY_BUILD;
  protected wasPaused = false;
  protected prevRate = 1;
  protected direction: "forwards" | "backwards" = "forwards";
  protected intervalId: number | null = null;
  protected ptrTimeoutId: number | null = null;
  protected lastTimestamp = 0;

  constructor(ctlr: Controller, config = ctlr.settings.fastPlay) {
    super(ctlr, config, { active: false, ptrActive: false });
  }

  public override wire(): void {
    const run = () => this.ctlr.DOM.controlsContainer?.addEventListener("pointerdown", this.handlePointerDown, { capture: true, signal: this.signal });
    this.ctlr.flags.wired ? run() : this.ctlr.state.wonce("readyState", run, { signal: this.signal }); // #HEAVY: waits for !light
    // Post Wiring
    super.wire();
  }

  public speedUp(pos: "forwards" | "backwards", interim = performance.now() - this.lastTimestamp < this.config.pointer.threshold): void {
    if (this.state.active) return;
    this.state.active = true;
    if (!interim) (this.wasPaused = this.media.state.paused), (this.prevRate = this.media.state.playbackRate);
    this.ctlr.plug("settings.notifiers")?.comp("fastPlayNotifier")?.active();
    setTimeout(pos === "backwards" && this.config.allowRewind ? this.rewind : this.fastForward, 0, this.signal);
  }

  public slowDown(): void {
    if (!this.state.active) return;
    this.state.active = false;
    if (this.intervalId) clearInterval(this.intervalId), (this.intervalId = null);
    (this.media.status.rewindRate = 0), (this.lastTimestamp = performance.now()), this.media.off("intent.paused", this.handlePausedIntent);
    silence(() => ((this.media.intent.playbackRate = this.prevRate), (this.media.intent.paused = this.config.resetPaused ? this.wasPaused : false))), this.media.tick(["intent.playbackRate", "intent.paused"]);
    this.ctlr.plug("settings.notifiers")?.comp("fastPlayNotifier")?.inactive(), this.ctlr.plug("settings.overlay")?.hide();
  }

  public fastForward(rate = this.config.playbackRate): void {
    silence(() => ((this.media.intent.playbackRate = rate), (this.media.intent.paused = false)));
    this.media.status.rewindRate = 0;
  }

  public rewind(rate = this.config.playbackRate): void {
    silence(() => (this.media.intent.playbackRate = 1)), this.media.on("intent.paused", this.handlePausedIntent, { init: true, signal: this.signal });
    this.media.status.rewindRate = rate;
  }
  protected shiftTime(): void {
    silence((s = this.media.state) => (!s.paused && (this.media.intent.paused = true), (this.media.intent.currentTime = s.currentTime - this.media.status.rewindRate / this.settings.frame.fps))); // Apprentice Slider syncs, no CSS hack
  }
  public handlePausedIntent({ type, value }: REvent<CtlrMedia, "intent.paused">): void {
    if (value && type !== "init") return;
    if (!this.intervalId) this.shiftTime(), (this.intervalId = setInterval(this.shiftTime, Math.round(1000 / this.settings.frame.fps) - 9, this.signal)); // intervals lag; i'm 18 rn so, yeah!
    else this.ctlr.notify?.("mediaPause"), silence(() => (this.media.intent.paused = true)), clearInterval(this.intervalId), (this.intervalId = null);
  }

  protected handlePointerDown(e: PointerEvent): void {
    if (e.target !== e.currentTarget || !new RegExp(`all|${e.pointerType}`).test(this.config.pointer.type.value) || this.media.state.miniplayer || this.state.active) return;
    for (const evt of ["touchmove", "mouseup", "mouseleave", "touchend", "touchcancel"]) this.media.container.addEventListener(evt, this.handlePointerUp, { signal: this.signal });
    clearTimeout(this.ptrTimeoutId!);
    this.ptrTimeoutId = setTimeout(
      () => {
        this.media.container.removeEventListener("touchmove", this.handlePointerUp);
        this.state.ptrActive = true;
        const { width, left } = this.media.container.getBoundingClientRect(),
          rLeft = (e.clientX ?? (e as unknown as TouchEvent).targetTouches[0].clientX) - left;
        this.direction = rLeft >= width / 2 ? "forwards" : "backwards";
        if (rLeft < this.config.pointer.inset || rLeft > width - this.config.pointer.inset) return;
        if (this.config.allowRewind) for (const evt of ["mousemove", "touchmove"]) this.media.container.addEventListener(evt, this.handlePointerMove, { signal: this.signal });
        this.speedUp(this.direction);
      },
      this.config.pointer.threshold,
      this.signal
    );
  }

  protected handlePointerMove(e: globalThis.Event): void {
    if ((e as TouchEvent).touches?.length > 1) return;
    this.ctlr.throttle(
      "speedPointerMove",
      () => {
        const { width, left } = this.media.container.getBoundingClientRect(),
          pos = ((e as MouseEvent).clientX ?? (e as TouchEvent).targetTouches[0].clientX) - left >= width / 2 ? "forwards" : "backwards";
        if (pos !== this.direction) this.slowDown(), this.speedUp((this.direction = pos), true);
      },
      200
    );
  }

  protected handlePointerUp(e: globalThis.Event): void {
    if (e.type === "mouseleave" && this.media.container.matches(":hover")) return;
    clearTimeout(this.ptrTimeoutId!);
    this.state.ptrActive = false;
    if (this.state.active && (this.ctlr.plug("settings.keys")?.playKeySeq ?? 0) < 1) setTimeout(this.slowDown, 300, this.signal); // safe dbl clicks need 250ms wait for singles
    for (const evt of ["touchmove", "mouseup", "mouseleave", "touchend", "touchcancel"]) this.media.container.removeEventListener(evt, this.handlePointerUp);
    for (const evt of ["mousemove", "touchmove"]) this.media.container.removeEventListener(evt, this.handlePointerMove);
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

declare module "@defs/contract" {
  interface MediaStatus {
    rewindRate: number;
  }
}

export type * from "./types";
export * from "./build";
