import { GESTURE_WHEEL_BUILD } from "./build";
import { GesturePlug } from "./index";
import { clamp } from "@utils/num";
import { setTimeout } from "@utils/fn";
import { GestureBasePin } from "./base";
import { GestureWheelConfig } from "./types";

export class GestureWheelPin extends GestureBasePin<GestureWheelConfig> {
  public static readonly pinName = "wheel";
  public static get Plug() {
    return GesturePlug;
  }
  public static readonly BUILD = GESTURE_WHEEL_BUILD;
  protected timeoutId: number | null = null;
  protected zone: { x: "left" | "right"; y: "top" | "bottom" } | null = null;
  protected xCheck = false;
  protected yCheck = false;
  protected timePercent = 0;
  protected timeMultiplier = 1;
  protected deltaY = 0;
  protected nextTime = 0;

  public override wire(): void {
    // Event Listeners
    this.media.container.addEventListener("wheel", this.handleWheel, { passive: false, signal: this.signal });
  }

  protected canHandle(e: WheelEvent): boolean {
    return !this.media.state.locked && !this.ctlr.config.disabled && e.target === this.ctlr.DOM.controlsContainer && !this.plug?.touch?.xCheck && !this.plug?.touch?.yCheck && !this.ctlr.plug("settings.fastPlay")?.state.active && (this.media.state.fullscreen || this.ctlr.isUIActive("floatingPlayer"));
  }

  protected handleWheel(e: WheelEvent): void {
    if (!this.canHandle(e)) return;
    e.preventDefault();
    this.timeoutId ? clearTimeout(this.timeoutId) : this.handleInit(e);
    this.timeoutId = setTimeout(this.handleStop, this.config.timeout, this.signal);
    this.handleMove(e);
  }

  protected handleInit({ clientX: x, clientY: y }: WheelEvent): void {
    const { left, top, right, bottom } = this.media.container.getBoundingClientRect();
    this.zone = { x: x - left > (right - left) / 2 ? "right" : "left", y: y - top > (bottom - top) / 2 ? "bottom" : "top" };
    this.deltaY = this.timePercent = 0;
    this.timeMultiplier = 1;
  }

  protected handleMove({ clientX: x, deltaX, deltaY, shiftKey: alt }: WheelEvent): void {
    deltaX = alt ? deltaY : deltaX;
    const { width: aWidth, height: aHeight, left } = this.media.container.getBoundingClientRect(),
      width = alt ? aHeight : aWidth,
      rHeight = ((alt ? aWidth : aHeight) * this.config.yRatio) / 2;
    let xPercent = -deltaX / (width * this.config.xRatio);
    xPercent = this.timePercent += xPercent;
    const xSign = xPercent >= 0 ? "+" : "-";
    xPercent = Math.abs(xPercent);
    if (deltaX || alt) {
      if (!this.config.timeline || this.yCheck) return this.handleStop();
      this.xCheck = true;
      this.ctlr.plug("settings.notifiers")?.comp("touchTimelineNotifier")?.active();
      this.applyTimeline({ percent: xPercent, sign: xSign, multiplier: this.timeMultiplier });
      if (alt) return;
    }
    if (deltaY) {
      if (this.xCheck) return this.applyTimeline({ percent: xPercent, sign: xSign, multiplier: (this.timeMultiplier = 1 - clamp(0, Math.abs((this.deltaY += deltaY)), rHeight) / rHeight) });
      const cancel = (this.zone?.x === "right" && !this.config.volume) || (this.zone?.x === "left" && !this.config.brightness);
      if (cancel || (x - left > width / 2 ? "right" : "left") !== this.zone?.x) return this.handleStop();
      this.yCheck = true;
      // prettier-ignore
      this.ctlr.plug("settings.notifiers")?.comp(this.zone?.x === "right" ? "touchVolumeNotifier" : "touchBrightnessNotifier")?.active();
      this.applyRange(this.zone?.x === "right" ? "volume" : "brightness", clamp(0, Math.abs(deltaY), rHeight * 2) / (rHeight * 2), -deltaY >= 0 ? "+" : "-");
    }
  }

  protected handleStop(): void {
    this.timeoutId = null;
    if (this.yCheck) {
      this.yCheck = false;
      this.ctlr.plug("settings.overlay")?.hide();
      this.ctlr.plug("settings.notifiers")?.comp("touchVolumeNotifier")?.inactive(), this.ctlr.plug("settings.notifiers")?.comp("touchBrightnessNotifier")?.inactive();
    }
    if (this.xCheck) {
      this.xCheck = false;
      this.ctlr.plug("settings.notifiers")?.comp("touchTimelineNotifier")?.inactive();
      this.media.intent.currentTime = this.nextTime;
    }
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "gesture.wheel": typeof GestureWheelPin;
  }
}
