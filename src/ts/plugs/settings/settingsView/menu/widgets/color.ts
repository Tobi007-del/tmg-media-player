import { UITuple } from "@defs/UIOptions";
import { BaseWidget, WidgetRegistry } from ".";
import { createEl, createListRenderer } from "@utils/dom";
import { parseUIOpt } from "@utils/obj";

export class ColorWidget<T = unknown> extends BaseWidget<T> {
  private renderSwatches!: ReturnType<typeof createListRenderer<UITuple<T>>>;
  private freeInput!: HTMLInputElement;
  private currentValue!: string;

  public override render(): HTMLElement {
    this.element = createEl("div", { className: "tmg-media-smenu-color-wrapper" });
    const grid = createEl("div", { className: "tmg-media-smenu-color-grid", role: "listbox" });
    this.renderSwatches = createListRenderer<UITuple<T>>({
      container: grid,
      getKey: (opt) => opt.value as string,
      createNode: (opt) => {
        const btn = createEl("button", { type: "button", className: "tmg-media-smenu-color-swatch", title: opt.display, ariaLabel: opt.display }, { colorVal: opt.value as string });
        btn.style.setProperty("--swatch", opt.value as string);
        btn.addEventListener("click", () => {
          this.item.onChange?.(opt.value);
          this.currentValue = btn.ariaLabel ?? btn.dataset.colorVal!;
          this.freeInput.value = btn.dataset.colorVal!;
          this.syncActive();
        });
        return btn;
      },
      updateNode: (node, opt) => {
        node.style.setProperty("--swatch", opt.value as string);
        node.dataset.colorVal = opt.value as string;
        node.ariaLabel = opt.display;
        node.ariaSelected = String(opt.display === this.currentValue || node.dataset.colorVal === this.currentValue);
        node.classList.toggle("tmg-media-smenu-color-active", opt.display === this.currentValue || node.dataset.colorVal === this.currentValue);
      },
    });
    const field = t007.field({ type: "color", value: this.currentValue, className: "tmg-media-smenu-color-free" });
    (this.freeInput = field.inputEl).addEventListener("input", () => {
      this.item.onChange?.(this.freeInput.value as T);
      const activeBtn = this.element.querySelector<HTMLElement>(`[data-color-val="${this.freeInput.value}"]`);
      this.currentValue = activeBtn?.ariaLabel ?? this.freeInput.value;
      this.syncActive();
    });
    return this.element.append(grid, field), this.syncUI(), this.element;
  }
  public override syncUI(): void {
    this.currentValue = this.item.getValue() || "";
    const activeBtn = this.element.querySelector<HTMLElement>(`:is([aria-label="${this.currentValue}"], [data-color-val="${this.currentValue}"])`);
    if (this.freeInput) this.freeInput.value = activeBtn?.dataset.colorVal ?? this.currentValue;
    this.renderSwatches((this.item.getOptions?.() ?? []).map((o) => parseUIOpt(o)));
    this.syncActive();
  }

  private syncActive(): void {
    for (const btn of this.element.querySelectorAll<HTMLElement>("[data-color-val]")) {
      const active = btn.ariaLabel === this.currentValue || btn.dataset.colorVal === this.currentValue;
      btn.classList.toggle("tmg-media-smenu-color-active", active);
      btn.ariaSelected = String(active);
    }
  }
}

WidgetRegistry.register("color", ColorWidget);
