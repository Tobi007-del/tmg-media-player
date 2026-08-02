import { BaseWidget, WidgetRegistry } from ".";
import { createEl } from "@utils/dom";
import { getActiveEl } from "@t007/utils";
import { setTimeout } from "sia-reactor/utils";

export class LimitsWidget extends BaseWidget<Record<string, number>> {
  private form!: HTMLFormElement;

  public override render(): HTMLElement {
    this.form = createEl("form", { className: "t007-input-form tmg-media-limits-form", noValidate: true });
    this.element = createEl("div", { className: "tmg-media-smenu-limits-wrapper" });
    for (const inp of this.item.getLimits?.() || []) {
      const row = createEl("fieldset", { className: "tmg-media-limits-row" }),
        wrap = createEl("div", { className: "tmg-media-limits-row-wrap" });
      row.append(createEl("legend", { className: "tmg-media-limits-row-legend", textContent: inp.label }));
      for (const key of ["min", "max", "step", "start", "end"] as const) if (key in inp) wrap.append(t007.field({ type: "number", name: `${inp.name}_${key}`, label: key.toUpperCase(), required: false, className: "tmg-media-limits-field", step: "any" }));
      row.append(wrap), this.form.append(row);
    }
    this.form.append(createEl("button", { className: "tmg-media-smenu-limits-btn", type: "submit", textContent: "Save Limits" }));
    (this.form as any).onSubmit = () => {
      const val = Array.from(this.form.elements)
        .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && !!el.name)
        .reduce((acc, el) => ((acc[el.name] = Number(el.value)), acc), {} as Record<string, number>);
      setTimeout(() => (this.item.onChange?.(val), this.ctlr.plug("settings.settingsView")?.menu.goBack()), 0, this.signal);
    };
    return t007.handleFormValidation?.(this.form), this.element.append(this.form), this.syncUI(), this.element;
  }

  public override syncUI(): void {
    for (const inp of this.item.getLimits?.() || []) {
      for (const key of ["min", "max", "step", "start", "end"] as const) {
        const input = key in inp ? this.form.querySelector<HTMLInputElement>(`input[name="${inp.name}_${key}"]`) : null;
        if (input && getActiveEl(document) !== input) input.value = inp[key] != null ? String(inp[key]) : "";
      }
      const minEl = this.form.querySelector<HTMLInputElement>(`input[name="${inp.name}_min"]`),
        maxEl = this.form.querySelector<HTMLInputElement>(`input[name="${inp.name}_max"]`);
      if (minEl && maxEl) (minEl.max = maxEl.value), (maxEl.min = minEl.value);
      const startEl = this.form.querySelector<HTMLInputElement>(`input[name="${inp.name}_start"]`),
        endEl = this.form.querySelector<HTMLInputElement>(`input[name="${inp.name}_end"]`);
      if (startEl && endEl) (startEl.max = endEl.value), (endEl.min = startEl.value);
    }
  }
}

WidgetRegistry.register("limits", LimitsWidget);
