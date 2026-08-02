import { BasePlug } from "../../base";
import type { LockedConfig, LockedState } from "./types";
import { LOCKED_BUILD } from "./build";
import type { Controller } from "@core/controller";
import type { ScreenLockButton } from "@components/screenlock";
import type { REvent } from "sia-reactor";
import { ComponentRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { setTimeout, mockAsync } from "@utils/fn";
import { parseCSSTime } from "@utils/str";
import { CtlrMedia } from "@defs/contract";
import { CtlrConfig } from "@defs/config";

export class LockedPlug extends BasePlug<LockedConfig, LockedState> {
  public static readonly plugName = "locked";
  public static readonly BUILD = LOCKED_BUILD;
  public lockOverlayDelayId = -1;
  public wrapper!: HTMLDivElement;
  public control: ScreenLockButton | null = null;

  constructor(ctlr: Controller, config = ctlr.settings.locked) {
    super(ctlr, config, { visible: false });
  }

  public override mount(): void {
    // Variables Assignment
    this.wrapper = createEl("div", { className: "tmg-media-screen-locked-wrapper", innerHTML: `<p>Screen Locked</p><p>Tap to Unlock</p>` });
    this.control = ComponentRegistry.init("screenlock", this.ctlr);
    // DOM Injection
    this.ctlr.DOM.containerContentWrapper?.append(this.wrapper);
  }
  public override unmount(): void {
    this.wrapper.remove();
  }

  public override wire(): void {
    // Event Listeners
    this.media.container.addEventListener("click", this.handleScreenClick, { signal: this.signal });
    // Ctlr Media Watchers
    this.media.watch("tech", () => (this.media.features.locked ||= !this.config.disabled), { init: true, signal: this.signal });
    // ---------- Listeners
    this.media.on("intent.locked", this.handleLockedIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    // ---- Config --------
    this.ctlr.config.on("settings.locked.disabled", this.handleDisabled, { init: true, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.locked.disabled">): void {
    this.media.features.locked = !value; // #ABSOLUTE: always this outcome
    if (value && this.ctlr.isUIActive("locked")) this.media.intent.locked = false;
  }

  protected handleLockedIntent(e: REvent<CtlrMedia, "intent.locked">): void {
    if (e.resolved) return;
    const active = this.ctlr.isUIActive("locked");
    e.value ? !active && this.enter() : active && this.exit();
    e.resolve(this.name);
  }

  protected enter(): void {
    this.ctlr.plug("settings.settingsView")?.leaveView();
    setTimeout(this.showOverlay, 0, this.signal);
    this.media.container.classList.add("tmg-media-locked", "tmg-media-progress-bar");
    // this.ctlr.plug("settings.overlay")?.hide("force"), this.ctlr.plug("settings.keys")?.setEventListeners("remove");
  } // #STANDALONE: suitable partner courtesy

  protected async exit(): Promise<void> {
    this.removeOverlay();
    await mockAsync(parseCSSTime(this.settings.css.switchTransitionTime));
    this.media.container.classList.toggle("tmg-media-progress-bar", this.settings.controlPanel.progressBar);
    this.media.container.classList.remove("tmg-media-locked");
    // this.ctlr.plug("settings.overlay")?.show(), this.ctlr.plug("settings.keys")?.setEventListeners();
  } // #STANDALONE: needs scoped behavior

  protected handleScreenClick(): void {
    if (!this.config.disabled) this.state.visible ? this?.removeOverlay() : this?.showOverlay();
  }

  public showOverlay(): void {
    this.media.container.classList.add("tmg-media-locked-overlay");
    this.state.visible = true;
    this.delayOverlay();
  }

  public removeOverlay(): void {
    this.media.container.classList.remove("tmg-media-locked-overlay");
    this.state.visible = false;
  }

  public delayOverlay(): void {
    clearTimeout(this.lockOverlayDelayId);
    this.lockOverlayDelayId = setTimeout(this.removeOverlay, this.settings.overlay.delay, this.signal);
  }

  protected override onDestroy(): void {
    this.control?.destroy(), super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.locked": typeof LockedPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    locked: LockedConfig;
  }
}
