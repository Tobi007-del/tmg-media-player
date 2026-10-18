import { UITuple } from "@defs/UIOptions";
import { BaseWidget, WidgetRegistry } from ".";
import { createEl, createListRenderer } from "@utils/dom";
import { parseUIOpt } from "@utils/obj";

export class ColorWidget<T = unknown> extends BaseWidget<T> {
  private renderSwatches!: ReturnType<typeof createListRenderer<UITuple<T>>>;
  private freeInput!: HTMLInputElement;
  private field!: HTMLElement;
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
        btn.addEventListener("click", () => ((this.freeInput.value = btn.dataset.colorVal!), this.syncColor("onChange", opt.value as string)), { signal: this.signal });
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
    const field = (this.field = t007.field({ type: "color", value: this.currentValue, className: "tmg-media-smenu-color-free" }));
    ((this.freeInput = field.inputEl) as any).t007Field = field;
    this.freeInput.addEventListener("input", this.handleColor, { signal: this.signal });
    this.freeInput.addEventListener("change", this.handleColor, { signal: this.signal });
    return this.element.append(grid, field), this.syncUI(), this.element;
  }
  public override syncUI(): void {
    this.currentValue = (this.item.getValue() as string) ?? "";
    const activeBtn = this.element.querySelector<HTMLElement>(`:is([aria-label="${this.currentValue}"], [data-color-val="${this.currentValue}"])`);
    if (this.freeInput) {
      this.freeInput.value = activeBtn?.dataset.colorVal ?? this.currentValue;
      this.field?.style.setProperty("--input-color", this.freeInput.value);
    }
    this.renderSwatches((this.item.getOptions?.() ?? []).map(parseUIOpt));
    this.syncActive();
  }

  private syncColor(type: "onInput" | "onChange" = "onChange", value = this.freeInput.value): void {
    const activeBtn = this.element.querySelector<HTMLElement>(`[data-color-val="${value}"]`);
    this.currentValue = activeBtn?.ariaLabel ?? value;
    this.field.style.setProperty("--input-color", value);
    this.syncActive();
    (type === "onInput" ? this.item.onInput ?? this.item.onChange : this.item.onChange)?.(value as T);
  }

  private handleColor(e: Event): void {
    this.syncColor(e.type === "input" ? "onInput" : "onChange");
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
