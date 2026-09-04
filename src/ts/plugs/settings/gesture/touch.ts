import { GESTURE_TOUCH_BUILD } from "./build";
import { GesturePlug } from "./index";
import { clamp } from "@utils/num";
import { setTimeout } from "@utils/fn";
import { GestureBasePin } from "./base";
import { GestureTouchConfig } from "./types";

export class GestureTouchPin extends GestureBasePin<GestureTouchConfig> {
  public static readonly pinName = "touch";
  public static get Plug() {
    return GesturePlug;
  }
  public static readonly BUILD = GESTURE_TOUCH_BUILD;
  protected lastX = 0;
  protected lastY = 0;
  protected zone: { x: "left" | "right"; y: "top" | "bottom" } | null = null;
  public xCheck = false;
  public yCheck = false;
  protected canCancel = true;
  protected cancelTimeoutId = -1;
  protected sliderTimeoutId = -1;

  public override wire(): void {
    // Event Listeners
    this.ctlr.DOM.controlsContainer?.addEventListener("touchstart", this.handleStart, { capture: true, signal: this.signal });
  }

  protected canHandle(e: TouchEvent): boolean {
    return !this.ctlr.config.disabled && e.touches?.length === 1 && e.target === this.ctlr.DOM.controlsContainer && !this.ctlr.plug("settings.fastPlay")?.state.active;
  }

  protected handleStart(e: TouchEvent): void {
    if (!this.canHandle(e)) return;
    this.handleEnd();
    (this.lastX = e.touches[0].clientX), (this.lastY = e.touches[0].clientY);
    this.media.container.addEventListener("touchmove", this.handleInit, { once: true, signal: this.signal });
    this.cancelTimeoutId = setTimeout(() => (this.canCancel = false), this.config.threshold, this.signal);
    for (const evt of ["touchend", "touchcancel"]) this.media.container.addEventListener(evt, this.handleEnd, { signal: this.signal });
  }

  protected handleInit(e: Event, te = e as TouchEvent): void {
    if (te.touches?.length > 1 || this.ctlr.plug("settings.fastPlay")?.state.active) return;
    te.preventDefault();
    const { width, height, left, top } = this.media.container.getBoundingClientRect(),
      x = te.touches[0].clientX,
      y = te.touches[0].clientY,
      deltaX = Math.abs(this.lastX - x),
      deltaY = Math.abs(this.lastY - y);
    this.zone = { x: x - left > width / 2 ? "right" : "left", y: y - top > height / 2 ? "bottom" : "top" };
    const rLeft = this.lastX - left,
      rTop = this.lastY - top;
    if (deltaX > deltaY * this.config.axesRatio && rLeft > this.config.inset && rLeft < width - this.config.inset) {
      if (this.config.timeline) {
        this.xCheck = true;
        this.media.container.addEventListener("touchmove", this.handleXMove, { passive: false, signal: this.signal });
      }
    } else if (deltaY > deltaX * this.config.axesRatio && rTop > this.config.inset && rTop < height - this.config.inset) {
      if ((this.config.volume && this.zone?.x === "right") || (this.config.brightness && this.zone?.x === "left")) {
        this.yCheck = true;
        this.media.container.addEventListener("touchmove", this.handleYMove, { passive: false, signal: this.signal });
      }
    }
  }

  protected handleXMove(e: Event, te = e as TouchEvent): void {
    if (this.canCancel) return this.handleEnd();
    te.preventDefault();
    this.ctlr.plug("settings.notifiers")?.comp("touchTimelineNotifier")?.active();
    this.ctlr.throttle(
      "gestureTouchMove",
      () => {
        const { width, height } = this.ctlr.state.dimensions.container,
          rHeight = (height * this.config.yRatio) / 2,
          deltaX = te.touches[0].clientX - this.lastX,
          deltaY = te.touches[0].clientY - this.lastY,
          percent = clamp(0, Math.abs(deltaX), width * this.config.xRatio) / (width * this.config.xRatio);
        this.applyTimeline({ percent, sign: deltaX >= 0 ? "+" : "-", multiplier: 1 - clamp(0, Math.abs(deltaY), rHeight) / rHeight });
      },
      30
    );
  }

  protected handleYMove(e: Event, te = e as TouchEvent): void {
    if (this.canCancel && !this.media.state.fullscreen) return this.handleEnd();
    te.preventDefault();
    // prettier-ignore
    this.ctlr.plug("settings.notifiers")?.comp(this.zone?.x === "right" ? "touchVolumeNotifier" : "touchBrightnessNotifier")?.active();
    this.ctlr.throttle(
      "gestureTouchMove",
      () => {
        const rHeight = this.ctlr.state.dimensions.container.height * this.config.yRatio,
          y = te.touches[0].clientY,
          deltaY = y - this.lastY;
        this.lastY = y;
        this.applyRange(this.zone?.x === "right" ? "volume" : "brightness", clamp(0, Math.abs(deltaY), rHeight) / rHeight, deltaY >= 0 ? "-" : "+");
      },
      30
    );
  }

  protected handleEnd(): void {
    if (this.xCheck) {
      this.xCheck = false;
      this.media.container.removeEventListener("touchmove", this.handleXMove);
      this.ctlr.plug("settings.notifiers")?.comp("touchTimelineNotifier")?.inactive();
      if (!this.canCancel) this.media.intent.currentTime = this.nextTime;
    }
    if (this.yCheck) {
      this.yCheck = false;
      this.media.container.removeEventListener("touchmove", this.handleYMove);
      clearTimeout(this.sliderTimeoutId);
      this.sliderTimeoutId = setTimeout(() => (this.ctlr.plug("settings.notifiers")?.comp("touchVolumeNotifier")?.inactive(), this.ctlr.plug("settings.notifiers")?.comp("touchBrightnessNotifier")?.inactive()), this.config.sliderTimeout, this.signal);
      if (!this.canCancel) this.ctlr.plug("settings.overlay")?.hide();
    }
    clearTimeout(this.cancelTimeoutId);
    this.canCancel = true;
    this.media.container.removeEventListener("touchmove", this.handleInit);
    for (const evt of ["touchend", "touchcancel"]) this.media.container.removeEventListener(evt, this.handleEnd);
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "gesture.touch": typeof GestureTouchPin;
  }
}
