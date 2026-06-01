import { IconRegistry } from "@core/registries";
import { BaseComponent, ComponentState } from "../base";
import { createEl } from "@utils/dom";
import { IS_MOBILE } from "@utils/browser";

export type FullscreenLockConfig = undefined;

export class FullscreenLockButton extends BaseComponent<FullscreenLockConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "fullscreenlock";
  public static readonly isControl: boolean = true;

  public override create() {
    this.element = createEl("button", { type: "button", className: "tmg-media-fullscreen-locked-btn", innerHTML: IconRegistry.get("lock") }, { draggableControl: "", controlId: this.name });
    return this.hide(), this.element;
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.fullscreen", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.fullscreen", () => this[this.canShow ? "show" : "hide"](), { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    this.syncARIA();
  }

  protected handleClick(): void {
    this.ctlr.settings.locked.disabled = false;
  }

  public syncARIA(): void {
    this.el.title = this.state.label = "Lock Screen";
    this.setBtnARIA();
  }

  protected override get canShow(): boolean {
    return !IS_MOBILE && this.media.state.fullscreen && this.media.features.fullscreen;
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    fullscreenlock: typeof FullscreenLockButton;
  }
}
