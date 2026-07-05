import { BaseWidget, WidgetRegistry } from ".";
import { createEl } from "@utils/dom";

export class ToggleWidget extends BaseWidget {
  private track!: HTMLElement;
  private input!: HTMLInputElement;

  public override render(): HTMLElement {
    this.track = createEl("span", { className: "tmg-media-smenu-toggle-track" });
    const thumb = createEl("span", { className: "tmg-media-smenu-toggle-thumb" });
    this.input = createEl("input", { type: "checkbox", className: "t007-input tmg-media-smenu-toggle-input" });
    this.element = createEl("label", { className: "tmg-media-smenu-toggle-wrapper", role: "switch" });
    this.track.append(thumb);
    this.element.append(this.input, this.track);
    this.input.addEventListener("change", () => (this.item.onChange?.(this.input.checked), (this.element.ariaChecked = String(this.input.checked)), this.syncTrack(this.input.checked)));
    return this.syncUI(), this.element;
  }

  public override syncUI(): void {
    this.input.checked = this.item.getValue() === "true" || this.item.getValue() === "On";
    this.element.ariaChecked = String(this.input.checked);
    this.syncTrack(this.input.checked);
  }

  private syncTrack(on: boolean): void {
    this.track.classList.toggle("tmg-media-smenu-toggle-on", on);
  }
}

WidgetRegistry.register("toggle", ToggleWidget);
