import { BasePlug } from "../../base";
import type { GestureConfig, GestureState } from "./types";
import type { GestureWheelPin } from "./wheel";
import type { GestureTouchPin } from "./touch";
import { GESTURE_BUILD } from "./build";
import { PinRegistry } from "@core/registries";
import { Controller } from "@core/controller";
import { addSafeClicks } from "@utils/dom";
import { IS_MOBILE } from "@utils/env";
import { rippleHandler } from "@t007/utils/hooks/vanilla";
import { setTimeout } from "sia-reactor/utils";

export class GesturePlug extends BasePlug<GestureConfig, GestureState> {
  public static readonly plugName = "gesture";
  public static readonly BUILD = GESTURE_BUILD;
  public wheel?: GestureWheelPin;
  public touch?: GestureTouchPin;
  public skipPersistPos: "left" | "right" | null = null;
  protected focusSubjectId = "";

  constructor(ctlr: Controller, config = ctlr.settings.gesture) {
    super(ctlr, config, { skipPersist: false });
    const WheelPin = PinRegistry.get("gesture.wheel"),
      TouchPin = PinRegistry.get("gesture.touch");
    WheelPin && (this.wheel = new WheelPin(this.ctlr, this.config.wheel)), TouchPin && (this.touch = new TouchPin(this.ctlr, this.config.touch));
  }

  public override wire(): void {
    const run = () => {
      // Event Listeners
      addSafeClicks(this.ctlr.DOM.controlsContainer, this.handleClick, this.handleDblClick, { capture: true, signal: this.signal });
      for (const el of [this.ctlr.DOM.controlsContainer, this.ctlr.DOM.bottomControlsWrapper]) {
        el?.addEventListener("click", this.handleAnyClick, { capture: true, signal: this.signal });
        el?.addEventListener("contextmenu", this.handleRightClick, { signal: this.signal });
        el?.addEventListener("focusin", this.handleFocusIn, { capture: true, signal: this.signal });
        el?.addEventListener("keydown", this.handleKeyFocusIn, { capture: true, signal: this.signal });
        for (const evt of ["pointermove", "dragenter", "scroll"]) el?.addEventListener(evt, this.handleHoverPointerActive, { capture: true, signal: this.signal });
        el?.addEventListener("mouseleave", this.handleHoverPointerOut, { capture: true, signal: this.signal });
      }
      // Utility Injection
      this.wheel?.wire(), this.touch?.wire();
    };
    this.ctlr.payload.wired ? run() : this.ctlr.state.wonce("readyState", run, { signal: this.signal }); // #HEAVY: waits for !lightState
    // Post Wiring
    super.wire();
  }

  public override mount(): void {
    this.wheel?.mount?.(), this.touch?.mount?.();
  }

  protected handleAnyClick(): void {
    this.ctlr.plug("settings.overlay")?.delay();
    // this.ctlr.plug("settings.controlPanel")?.comp("timeline")?.stopScrubbing();
  }

  protected handleRightClick(e: MouseEvent): void {
    e.preventDefault();
  }

  protected handleClick(e: MouseEvent): void {
    if (e.target !== this.ctlr.DOM.controlsContainer) return;
    if (this.ctlr.plug("settings.fastPlay")?.state.speedCheck && (this.ctlr.plug("settings.keys")?.playTriggerSeq ?? 1) < 1) return;
    if (IS_MOBILE && !this.media.state.pictureInPicture && !this.media.status.waiting && !this.media.status.ended && (!this.ctlr.plug("settings.time")?.skipNotifier || !this.ctlr.isUIActive("overlay"))) !/hidden|persistent/.test(this.settings.overlay.behavior.value) && this.media.container.classList.toggle("tmg-media-overlay");
    if (!this.media.state.miniplayer && this.config.click) (this.media.intent[this.config.click] = !this.media.state[this.config.click] as never), this.config.click === "paused" && this.ctlr.plug("settings.notifiers")?.notify(this.media.intent.paused ? "mediaPause" : "mediaPlay");
  }

  protected handleDblClick(e: MouseEvent): void {
    const { clientX: x, target, detail } = e;
    if (target !== this.ctlr.DOM.controlsContainer) return;
    const rect = this.media.container.getBoundingClientRect(),
      pos = x - rect.left > rect.width * 0.65 ? "right" : x - rect.left < rect.width * 0.35 ? "left" : "center";
    if (this.state.skipPersist && pos !== this.skipPersistPos) {
      this.stopSkipPersist();
      if (detail === 1) return;
    }
    if (pos === "center" && this.config.dblClick) return void ((this.media.intent[this.config.dblClick] = !this.media.state[this.config.dblClick] as never), this.config.dblClick === "paused" && this.ctlr.plug("settings.notifiers")?.notify(this.media.intent.paused ? "mediaPause" : "mediaPlay"));
    if (this.state.skipPersist && detail === 2) return;
    if (!this.state.skipPersist) this.startSkipPersist(pos as "left" | "right");
    this.ctlr.plug("settings.time")?.skip(pos === "right" ? this.settings.time.skip : -this.settings.time.skip);
    rippleHandler(e, { target: this.ctlr.plug("settings.time")?.skipNotifier });
  }

  protected handleFocusIn({ target }: FocusEvent, t = target as HTMLElement): void {
    this.focusSubjectId = String(!t?.matches?.(":focus-visible") && (t?.dataset?.controlId ?? t?.parentElement?.dataset?.controlId));
  }
  protected handleKeyFocusIn({ target }: KeyboardEvent, t = target as HTMLElement): void {
    if ((t?.dataset?.controlId ?? t?.parentElement?.dataset?.controlId) === this.focusSubjectId) t.blur();
  }

  protected handleHoverPointerActive(e: Event): void {
    const { target, pointerType } = e as PointerEvent,
      overlay = this.ctlr.plug("settings.overlay");
    (!pointerType || !IS_MOBILE) && overlay?.show();
    pointerType && (target as HTMLElement).closest(".tmg-media-side-controls-wrapper") && clearTimeout(overlay?.overlayDelayId ?? -1);
  }
  protected handleHoverPointerOut(): void {
    setTimeout(() => !IS_MOBILE && !this.media.container.matches(":hover") && this.ctlr.plug("settings.overlay")?.hide(), 0, this.signal);
  }

  public startSkipPersist(pos: "left" | "right"): void {
    if (this.state.skipPersist) return;
    this.media.container.addEventListener("click", this.handleDblClick, { signal: this.signal });
    (this.state.skipPersist = true), (this.skipPersistPos = pos);
  }
  public stopSkipPersist(): void {
    if (!this.state.skipPersist) return;
    this.media.container.removeEventListener("click", this.handleDblClick);
    (this.state.skipPersist = false), (this.skipPersistPos = null);
  }

  protected override onDestroy(): void {
    this.wheel?.destroy(), this.touch?.destroy(), super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";
export * from "./touch";
export * from "./wheel";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.gesture": typeof GesturePlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    gesture: GestureConfig;
  }
}
