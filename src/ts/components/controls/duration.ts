import { BaseComponent, ComponentState } from "@components/base";
import { createEl } from "@utils/dom";
import { formatKeyForDisplay } from "@utils/keys";

export type DurationConfig = undefined;

export class DurationButton extends BaseComponent<DurationConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "duration";
  public static readonly isControl: boolean = true;
  protected get plug() {
    return this.ctlr.plug("settings.time");
  }

  public override create() {
    return (this.element = createEl("button", { className: "tmg-media-total-time" }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("status.duration", this.syncUI, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.time.format", this.syncARIA, { init: true, signal: this.signal });
  }

  protected handleClick(): void {
    this.plug?.rotateFormat();
  }

  public syncUI(): void {
    this.el.textContent = this.plug?.toTimeText(this.media.status.duration) ?? "--:--";
  }
  public syncARIA(): void {
    this.state.label = "Switch time format";
    this.state.cmd = formatKeyForDisplay(this.ctlr.settings.time.format);
    this.el.title = this.state.label + this.state.cmd;
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    duration: typeof DurationButton;
  }
}
