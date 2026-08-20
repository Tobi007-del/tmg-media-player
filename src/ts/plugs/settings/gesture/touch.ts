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
    return !this.ctlr.config.disabled && e.touches?.length === 1 && e.target === this.ctlr.DOM.controlsContainer && !this.ctlr.plug("settings.fastPlay")?.state.speedCheck;
  }

  protected handleStart(e: TouchEvent): void {
    if (!this.canHandle(e)) return;
    this.handleEnd();
    this.lastX = e.touches[0].clientX;
    this.lastY = e.touches[0].clientY;
    this.media.container.addEventListener("touchmove", this.handleInit, { once: true, signal: this.signal });
    this.cancelTimeoutId = setTimeout(() => (this.canCancel = false), this.config.threshold, this.signal);
    for (const evt of ["touchend", "touchcancel"]) this.media.container.addEventListener(evt, this.handleEnd, { signal: this.signal });
  }

  protected handleInit(e: Event): void {
    const te = e as TouchEvent;
    if (te.touches?.length > 1 || this.ctlr.plug("settings.fastPlay")?.state.speedCheck) return;
    te.preventDefault();
    const tc = this.config,
      rect = this.media.container.getBoundingClientRect(),
      x = te.touches[0].clientX,
      y = te.touches[0].clientY,
      deltaX = Math.abs(this.lastX - x),
      deltaY = Math.abs(this.lastY - y);
    this.zone = { x: x - rect.left > rect.width * 0.5 ? "right" : "left", y: y - rect.top > rect.height * 0.5 ? "bottom" : "top" };
    const rLeft = this.lastX - rect.left,
      rTop = this.lastY - rect.top;
    if (deltaX > deltaY * tc.axesRatio && rLeft > tc.inset && rLeft < rect.width - tc.inset) {
      if (tc.timeline) {
        this.xCheck = true;
        this.media.container.addEventListener("touchmove", this.handleXMove, { passive: false, signal: this.signal });
      }
    } else if (deltaY > deltaX * tc.axesRatio && rTop > tc.inset && rTop < rect.height - tc.inset) {
      if ((tc.volume && this.zone?.x === "right") || (tc.brightness && this.zone?.x === "left")) {
        this.yCheck = true;
        this.media.container.addEventListener("touchmove", this.handleYMove, { passive: false, signal: this.signal });
      }
    }
  }

  protected handleXMove(e: Event): void {
    const te = e as TouchEvent;
    if (this.canCancel) return this.handleEnd();
    te.preventDefault();
    this.ctlr.plug("settings.notifiers")?.comp("touchTimelineNotifier")?.active();
    this.ctlr.throttle(
      "gestureTouchMove",
      () => {
        const tc = this.config,
          { width, height } = this.ctlr.state.dimensions.container,
          x = te.touches[0].clientX,
          y = te.touches[0].clientY,
          deltaX = x - this.lastX,
          deltaY = y - this.lastY,
          sign = deltaX >= 0 ? "+" : "-",
          percent = clamp(0, Math.abs(deltaX), width * tc.xRatio) / (width * tc.xRatio),
          mY = clamp(0, Math.abs(deltaY), height * tc.yRatio * 0.5),
          multiplier = 1 - mY / (height * tc.yRatio * 0.5);
        this.applyTimeline({ percent, sign, multiplier });
      },
      30,
      false,
      this.signal
    );
  }

  protected handleYMove(e: Event): void {
    const te = e as TouchEvent;
    if (this.canCancel && !this.media.state.fullscreen) return this.handleEnd();
    te.preventDefault();
    // prettier-ignore
    this.ctlr.plug("settings.notifiers")?.comp(this.zone?.x === "right" ? "touchVolumeNotifier" : "touchBrightnessNotifier")?.active();
    this.ctlr.throttle(
      "gestureTouchMove",
      () => {
        const tc = this.config,
          height = this.ctlr.state.dimensions.container.height,
          y = te.touches[0].clientY,
          deltaY = y - this.lastY,
          sign = deltaY >= 0 ? "-" : "+",
          percent = clamp(0, Math.abs(deltaY), height * tc.yRatio) / (height * tc.yRatio);
        this.lastY = y;
        this.applyRange(this.zone?.x === "right" ? "volume" : "brightness", percent, sign);
      },
      30,
      false,
      this.signal
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
