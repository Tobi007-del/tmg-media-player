import { silence } from "sia-reactor/modules";
import { BasePlug } from "../../base";
import { FAST_PLAY_BUILD } from "./build";
import type { FastPlayConfig, FastPlayState } from "./types";
import type { Controller } from "@core/controller";
import { setTimeout, setInterval } from "@utils/fn";

export class FastPlayPlug extends BasePlug<FastPlayConfig, FastPlayState> {
  public static readonly plugName = "fastPlay";
  public static readonly BUILD = FAST_PLAY_BUILD;
  protected wasPaused = false;
  protected prevRate = 1;
  protected rewindRate = 0;
  protected direction: "forwards" | "backwards" = "forwards";
  protected intervalId: number | null = null;
  protected ptrTimeoutId: number | null = null;
  protected lastTimestamp = 0;

  constructor(ctlr: Controller, config = ctlr.settings.fastPlay) {
    super(ctlr, config, { active: false, ptrActive: false, rewinding: false });
  }

  public override wire(): void {
    const run = () => this.ctlr.DOM.controlsContainer?.addEventListener("pointerdown", this.handlePointerDown, { capture: true, signal: this.signal });
    this.ctlr.payload.wired ? run() : this.ctlr.state.wonce("readyState", run, { signal: this.signal }); // #HEAVY: waits for !lightState
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
    this.intervalId && clearInterval(this.intervalId), this.media.off("state.paused", this.unwind);
    silence(() => (this.media.intent.playbackRate = this.prevRate));
    (this.rewindRate = 0), (this.state.rewinding = false), (this.lastTimestamp = performance.now());
    silence(() => (this.media.intent.paused = this.config.resetPaused ? this.wasPaused : false));
    this.ctlr.plug("settings.overlay")?.hide();
    this.ctlr.plug("settings.notifiers")?.compEl("fastPlayNotifier")?.classList.remove("tmg-media-control-active", "tmg-media-rewind");
  }

  public fastForward(rate = this.config.playbackRate): void {
    silence(() => (this.media.intent.playbackRate = rate));
    this.state.rewinding = false;
    this.ctlr.plug("settings.notifiers")?.compEl("fastPlayNotifier")?.classList.remove("tmg-media-rewind");
    silence(() => (this.media.intent.paused = false));
  }

  public rewind(rate = this.config.playbackRate): void {
    silence(() => (this.media.intent.playbackRate = 1));
    (this.rewindRate = rate), (this.state.rewinding = true);
    this.ctlr.plug("settings.notifiers")?.compEl("fastPlayNotifier")?.classList.add("tmg-media-rewind");
    this.media.on("state.paused", this.unwind, { signal: this.signal });
    this.intervalId = setInterval(this.shiftTime, Math.round(1000 / this.settings.frame.fps) - 18, this.signal); // intervals lag; i'm 18 rn so, yeah!
  }
  protected shiftTime(): void {
    const textEl = this.ctlr.plug("settings.notifiers")?.comp("fastPlayNotifier")?.text;
    if (textEl) textEl.textContent = `${this.rewindRate}x`;
    if (!this.media.state.paused) silence(() => (this.media.intent.paused = true));
    silence(() => (this.media.intent.currentTime = this.media.state.currentTime - this.rewindRate / this.settings.frame.fps)); // Apprentice Slider syncs, no CSS hack
  }
  public unwind(): void {
    if (this.media.state.paused) return;
    if (this.intervalId) {
      this.ctlr.plug("settings.notifiers")?.notify("mediaPause");
      silence(() => (this.media.intent.paused = true));
      clearInterval(this.intervalId), (this.intervalId = null);
    } else this.intervalId ??= setInterval(this.shiftTime, Math.round(1000 / this.settings.frame.fps) - 18, this.signal);
  }

  protected handlePointerDown(e: PointerEvent): void {
    if (!new RegExp(`all|${e.pointerType}`).test(this.config.pointer.type.value) || e.target !== this.ctlr.DOM.controlsContainer || this.media.state.miniplayer || this.state.active) return;
    for (const evt of ["touchmove", "mouseup", "touchend", "touchcancel"]) this.media.container.addEventListener(evt, this.handlePointerUp, { signal: this.signal });
    this.media.container.addEventListener("mouseleave", this.handlePointerOut, { signal: this.signal });
    clearTimeout(this.ptrTimeoutId!);
    this.ptrTimeoutId = setTimeout(
      () => {
        this.media.container.removeEventListener("touchmove", this.handlePointerUp);
        this.state.ptrActive = true;
        const { width, left } = this.media.container.getBoundingClientRect(),
          rLeft = (e.clientX ?? (e as unknown as TouchEvent).targetTouches?.[0]?.clientX) - left;
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
          pos = ((e as MouseEvent).clientX ?? (e as TouchEvent).targetTouches?.[0]?.clientX) - left >= width / 2 ? "forwards" : "backwards";
        if (pos !== this.direction) this.slowDown(), this.speedUp((this.direction = pos), true);
      },
      200
    );
  }

  protected handlePointerUp(): void {
    clearTimeout(this.ptrTimeoutId!);
    this.state.ptrActive = false;
    if (this.state.active && (this.ctlr.plug("settings.keys")?.playTriggerSeq ?? 0) < 1) setTimeout(this.slowDown, 350, this.signal); // safe dbl clicks need 300ms wait for singles
    for (const evt of ["touchmove", "mouseup", "touchend", "touchcancel"]) this.media.container.removeEventListener(evt, this.handlePointerUp);
    for (const evt of ["mousemove", "touchmove"]) this.media.container.removeEventListener(evt, this.handlePointerMove);
    this.media.container.removeEventListener("mouseleave", this.handlePointerOut);
  }
  protected handlePointerOut(): void {
    !this.media.container.matches(":hover") && this.handlePointerUp();
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
