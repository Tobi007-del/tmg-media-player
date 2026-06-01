import { BasePlug } from "../../base";
import type { Locked, LockedState } from "./types";
import { LOCKED_BUILD } from "./build";
import type { Controller } from "@core/controller";
import type { ScreenLockButton } from "@components/screenlock";
import type { CtlrConfig } from "@defs/config";
import type { REvent } from "sia-reactor";
import { ComponentRegistry } from "@core/registries";
import { createEl } from "@utils/dom";
import { setTimeout, mockAsync } from "@utils/fn";
import { parseCSSTime } from "@utils/str";

export class LockedPlug extends BasePlug<Locked, LockedState> {
  public static readonly plugName = "locked";
  public static readonly BUILD = LOCKED_BUILD;
  public lockOverlayDelayId = -1;
  public wrapper!: HTMLDivElement;
  public control: ScreenLockButton | null = null;

  constructor(ctlr: Controller, config: Locked = ctlr.config.settings.locked) {
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
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.locked.disabled", this.handleDisabled, { init: true, signal: this.signal });
  }

  protected handleScreenClick(): void {
    if (!this.config.disabled) this.state.visible ? this?.removeOverlay() : this?.showOverlay();
  }

  protected async handleDisabled({ value }: REvent<CtlrConfig, "settings.locked.disabled">): Promise<void> {
    if (!value) {
      this.ctlr.plug("settings.settingsView")?.leaveView();
      setTimeout(this.showOverlay, 0, this.signal);
      this.media.container.classList.add("tmg-media-locked", "tmg-media-progress-bar");
      this.ctlr.plug("settings.overlay")?.remove("force");
      this.ctlr.plug("settings.keys")?.setEventListeners("remove");
    } else {
      this.removeOverlay();
      await mockAsync(parseCSSTime(this.ctlr.settings.css.switchTransitionTime));
      this.media.container.classList.toggle("tmg-media-progress-bar", this.ctlr.settings.controlPanel.progressBar);
      this.media.container.classList.remove("tmg-media-locked");
      this.ctlr.plug("settings.overlay")?.show();
      this.ctlr.plug("settings.keys")?.setEventListeners();
    }
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
    this.lockOverlayDelayId = setTimeout(this.removeOverlay, this.ctlr.settings.overlay.delay, this.signal);
  }

  protected override onDestroy(): void {
    this.control?.destroy();
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
    locked: Locked;
  }
}
