import { BasePin } from "../../base";
import { type REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { isFunc } from "@utils/obj";
import { ComponentRegistry } from "@core/registries";
import { AirPlayPlaceholder } from "@components/holders/airplayPlaceholder";
import { MODES_AIRPLAY_BUILD, ModesPlug } from "./index";
import { ModesAirPlayConfig, ModesAirPlayState } from "./types";
import type { Controller } from "@core/controller";

export class ModesAirPlayPin extends BasePin<ModesPlug, ModesAirPlayConfig, ModesAirPlayState> {
  public static readonly pinName = "airplay";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_AIRPLAY_BUILD;
  protected placeholder: AirPlayPlaceholder | null = null;

  constructor(ctlr: Controller, config = ctlr.settings.modes.airplay) {
    super(ctlr, config, { isAvailable: false });
  }

  public override wire(): void {
    // State Watchers
    this.state.watch("isAvailable", this.syncFeatures, { signal: this.signal });
    // Event Listeners
    if (isFunc(window.WebKitPlaybackTargetAvailabilityEvent)) {
      this.media.element.addEventListener("webkitplaybacktargetavailabilitychanged", this.handleAvailabilityChange, { capture: true, signal: this.signal });
      this.media.element.addEventListener("webkitcurrentplaybacktargetiswirelesschanged", this.handleWirelessChange, { capture: true, signal: this.signal });
    }
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- Config -------
    this.ctlr.config.watch("settings.modes.airplay.disabled", this.syncFeatures, { signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.airplay", this.handleAirPlayIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal });
    // Post Wiring
    this.ctlr.learn("airplay", undefined, this.signal);
  }

  protected handleAvailabilityChange(e: any, can = e.availability === "available"): void {
    this.state.isAvailable = can; // e.availability returns "available" if an Apple TV/HomePod is on the network
  }

  protected handleWirelessChange(): void {
    this.placeholder ??= ComponentRegistry.init("airplayPlaceholder", this.ctlr);
    this.media.container.classList.toggle("tmg-media-airplay", (this.media.state.airplay = !!this.media.element.webkitCurrentPlaybackTargetIsWireless)); // Safari handles the playback sync natively.
  }

  protected handleAirPlayIntent(e: REvent<CtlrMedia, "intent.airplay">): void {
    if (e.resolved || !e.value) return;
    if (!this.ctlr.isUIActive("airplay")) {
      this.media.element?.webkitShowPlaybackTargetPicker?.(); // Apple requires this to be triggered by a direct user gesture (like a click)
      this.ctlr.plug("settings.notifiers")?.notify("airplay"); // #STALLING: necessary optimistic distraction
    }
    e.resolve(this.name);
  }

  protected syncFeatures(): void {
    this.media.tech.polyfill("airplay", this.ctlr.isNativeEl && this.state.isAvailable, this.config.disabled);
  }

  protected override onDestroy(): void {
    this.placeholder?.destroy(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.airplay": typeof ModesAirPlayPin;
  }
}

declare global {
  interface Window {
    WebKitPlaybackTargetAvailabilityEvent?: any;
  }
  interface HTMLMediaElement {
    webkitShowPlaybackTargetPicker?: () => void;
    webkitCurrentPlaybackTargetIsWireless?: boolean;
  }
}
