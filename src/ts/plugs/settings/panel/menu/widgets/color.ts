import { UITuple } from "@defs/UIOptions";
import { BaseWidget, WidgetRegistry } from ".";
import { createEl, createListRenderer } from "@utils/dom";
import { parseUIOpt } from "@utils/obj";
import { startTx, endTx, type Transaction } from "sia-reactor/modules";

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
        btn.addEventListener("click", () => ((this.freeInput.value = btn.dataset.colorVal!), this.syncColor(opt.value as string)), { signal: this.signal });
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
    for (const ev of ["input", "change"]) this.freeInput.addEventListener(ev, this.handleColor, { signal: this.signal });
    this.freeInput.addEventListener("blur", () => this.useTx(false), { signal: this.signal });
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

  private handleColor(e: Event): void {
    e.type === "input" && this.useTx(true), this.syncColor(this.freeInput.value), e.type === "change" && this.useTx(false);
  }

  private syncColor(value = this.freeInput.value): void {
    const activeBtn = this.element.querySelector<HTMLElement>(`[data-color-val="${value}"]`);
    this.currentValue = activeBtn?.ariaLabel ?? value;
    this.field.style.setProperty("--input-color", value);
    this.syncActive();
    this.item.onChange?.(value as T);
  }

  private syncActive(): void {
    for (const btn of this.element.querySelectorAll<HTMLElement>("[data-color-val]")) {
      const active = btn.ariaLabel === this.currentValue || btn.dataset.colorVal === this.currentValue;
      btn.classList.toggle("tmg-media-smenu-color-active", active);
      btn.ariaSelected = String(active);
    }
  }

  private tx: Transaction | null = null;
  private useTx(bool = false): void {
    bool ? (this.tx ??= startTx(this.item.label || this.item.id)) : this.tx && (endTx(this.tx), (this.tx = null));
  }
}

WidgetRegistry.register("color", ColorWidget);
