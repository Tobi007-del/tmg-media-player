import { BasePlug } from "../../base";
import { type REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { AIRPLAY_BUILD } from "./build";
import { isFunc } from "@utils/obj";
import { ComponentRegistry } from "@core/registries";
import { AirPlayPlaceholder } from "@components/holders/airplayplaceholder";
import { AirPlayConfig } from "./types";

export class AirPlayPlug extends BasePlug<AirPlayConfig> {
  public static readonly plugName = "airplay";
  public static readonly BUILD = AIRPLAY_BUILD;
  public isAvailable = false;
  protected placeholder: AirPlayPlaceholder | null = null;

  public override wire(): void {
    // Event Listeners
    if (isFunc(window.WebKitPlaybackTargetAvailabilityEvent)) {
      this.media.element.addEventListener("webkitplaybacktargetavailabilitychanged", this.handleAvailability, { capture: true, signal: this.signal });
      this.media.element.addEventListener("webkitcurrentplaybacktargetiswirelesschanged", this.handleWirelessChange, { capture: true, signal: this.signal });
    }
    // Ctlr Media Watchers
    this.media.watch("tech", () => (this.media.features.airplay ||= this.ctlr.isNativeEl && this.isAvailable), { init: true, signal: this.signal });
    // --------- Listeners
    this.media.on("intent.airplay", this.handleAirPlayIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("airplay", { keyboard: { phase: "keyup" } }), super.wire();
  }

  protected handleAvailability(e: any, can = e.availability === "available"): void {
    if (can) (this.placeholder ??= ComponentRegistry.init("airplayplaceholder", this.ctlr))?.setup();
    (this.isAvailable = can), (this.media.features.airplay ||= this.ctlr.isNativeEl && can); // e.availability returns "available" if an Apple TV/HomePod is on the network
  }

  protected handleWirelessChange(): void {
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

  protected override onDestroy(): void {
    this.placeholder?.destroy(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.airplay": typeof AirPlayPlug;
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
