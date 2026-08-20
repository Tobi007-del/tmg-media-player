import { IconRegistry } from "@core/registries";
import { BaseComponent, ComponentState } from "./base";
import { createEl } from "@utils/dom";

export type ScreenLockConfig = undefined;

export class ScreenLockButton extends BaseComponent<ScreenLockConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "screenLock";
  protected get plug() {
    return this.ctlr.plug("settings.locked");
  }

  public override create() {
    return (this.element = createEl("button", { type: "button", className: "tmg-media-screen-locked-btn", tabIndex: -1, innerHTML: `${IconRegistry.get("lock")}${IconRegistry.get("unlock")}<p>Unlock controls?</p>` }));
  }

  public override mount(): void {
    // DOM Injection
    this.plug?.wrapper.prepend(this.el);
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Plug Listeners
    this.plug?.state.on("visible", this.syncUI, { init: true, signal: this.signal });
    // Post Wiring
    this.syncARIA();
  }

  protected handleClick(e: MouseEvent): void {
    e.stopPropagation();
    this.plug?.delayOverlay();
    if (this.el.classList.contains("tmg-media-control-unlock")) this.media.intent.locked = false;
    else this.el.classList.add("tmg-media-control-unlock");
  }

  public syncUI(): void {
    !this.plug?.state.visible && this.el.classList.remove("tmg-media-control-unlock");
  }
  public syncARIA(): void {
    this.el.title = this.state.label = "Unlock Screen";
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    screenLock: typeof ScreenLockButton;
  }
}
