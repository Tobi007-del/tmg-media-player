import { BasePlug } from "../../base";
import type { LockedConfig, LockedState } from "./types";
import { LOCKED_BUILD } from "./build";
import type { Controller } from "@core/controller";
import type { ScreenLockButton } from "@components/screenLock";
import type { REvent } from "sia-reactor";
import { ComponentRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { setTimeout, mockAsync } from "@utils/fn";
import { parseCSSTime } from "@utils/str";
import { CtlrMedia } from "@defs/contract";

export class LockedPlug extends BasePlug<LockedConfig, LockedState> {
  public static readonly plugName = "locked";
  public static readonly BUILD = LOCKED_BUILD;
  public lockOverlayDelayId = -1;
  public wrapper?: HTMLDivElement;
  public control: ScreenLockButton | null = null;

  constructor(ctlr: Controller, config = ctlr.settings.locked) {
    super(ctlr, config, { visible: false });
  }

  public override unmount(): void {
    this.wrapper?.remove();
  }

  public override wire(): void {
    // Event Listeners
    this.media.container.addEventListener("click", this.handleScreenClick, { signal: this.signal });
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.watch("settings.locked.disabled", this.syncFeatures, { signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.locked", this.handleLockedIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    // Post Wiring
    super.wire();
  }

  protected handleLockedIntent(e: REvent<CtlrMedia, "intent.locked">): void {
    if (e.resolved) return;
    const active = this.ctlr.isUIActive("locked");
    e.value ? !active && this.enter() : active && this.exit();
    e.resolve(this.name);
  }

  protected enter(): void {
    this.ctlr.plug("settings.settingsView")?.leaveView();
    this.wrapper ??= this.ctlr.DOM.containerContentWrapper?.appendChild(createEl("div", { className: "tmg-media-locked-wrapper", innerHTML: `<p>Screen Locked</p><p>Tap to Unlock</p>` }));
    this.control ??= ComponentRegistry.init("screenLock", this.ctlr);
    setTimeout(this.showOverlay, 0, this.signal);
    this.media.container.classList.add("tmg-media-locked", "tmg-media-progress-bar"), this.media.pseudoContainer.classList.add("tmg-media-locked"); // #TWINING
    this.media.state.locked = true;
    // this.ctlr.plug("settings.overlay")?.hide("force"), this.ctlr.plug("settings.keys")?.setListeners("remove");
  } // #STANDALONE: suitable partner courtesy

  protected async exit(): Promise<void> {
    this.hideOverlay();
    await mockAsync(parseCSSTime(this.settings.css.switchTransitionTime));
    this.media.container.classList.toggle("tmg-media-progress-bar", this.settings.controlPanel.progressBar);
    this.media.container.classList.remove("tmg-media-locked"), this.media.pseudoContainer.classList.remove("tmg-media-locked"); // #TWINING
    this.media.state.locked = false;
    // this.ctlr.plug("settings.overlay")?.show(), this.ctlr.plug("settings.keys")?.setListeners();
  } // #STANDALONE: needs scoped behavior

  protected handleScreenClick(): void {
    if (!this.config.disabled) this.state.visible ? this?.hideOverlay() : this?.showOverlay();
  }

  public showOverlay(): void {
    this.media.container.classList.add("tmg-media-locked-overlay");
    this.state.visible = true;
    this.delayOverlay();
  }

  public hideOverlay(): void {
    this.media.container.classList.remove("tmg-media-locked-overlay");
    this.state.visible = false;
  }

  public delayOverlay(): void {
    clearTimeout(this.lockOverlayDelayId);
    this.lockOverlayDelayId = setTimeout(this.hideOverlay, this.settings.overlay.delay, this.signal);
  }

  public syncFeatures(): void {
    this.media.tech.polyfill("locked", true, this.config.disabled);
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
