import { BaseWidget, WidgetRegistry } from ".";
import { createEl } from "@utils/dom";
import { getActiveEl } from "@t007/utils";
import { isFunc } from "@utils/obj";
import { setTimeout } from "sia-reactor/utils";

export class InputWidget extends BaseWidget<string | number | undefined | Record<string, string | number | undefined>> {
  private form!: HTMLFormElement;

  public override render(): HTMLElement {
    this.form = createEl("form", { className: "t007-input-form", noValidate: true });
    (this.item.inputs || [{ ...this.item, label: this.item.label || "Enter text" }]).forEach((inp) => this.form.append(t007.field({ required: !this.item.inputs, name: inp.label, ...inp, value: String(isFunc(inp.value) ? inp.value() : inp.value || "") })));
    this.form.append(createEl("button", { className: "tmg-media-smenu-input-btn", type: "submit", textContent: "Submit" }));
    (this.form as any).onSubmit = () => {
      const val = this.item.inputs
        ? Array.from(this.form.elements)
            .filter((el: any) => el.name)
            .reduce((acc, el: any) => ((acc[el.name] = el.type === "number" ? (el.value === "" ? undefined : Number(el.value)) : el.value), acc), {} as Record<string, string | number | undefined>)
        : (this.form.elements[0] as HTMLInputElement).type === "number"
        ? (this.form.elements[0] as HTMLInputElement).value === ""
          ? undefined
          : Number((this.form.elements[0] as HTMLInputElement).value)
        : (this.form.elements[0] as HTMLInputElement).value;
      setTimeout(() => (this.item.onChange?.(val), this.form.reset(), this.ctlr.plug("settings.settingsView")?.menu.goBack()), 0, this.signal);
    };
    t007.handleFormValidation?.(this.form);
    this.element = createEl("div", { className: "tmg-media-smenu-input-wrapper" });
    return this.element.append(this.form), this.syncUI(), this.element;
  }

  public override syncUI(): void {
    if (this.item.inputs) {
      this.item.inputs.forEach((inp) => {
        const input = this.form.querySelector<HTMLInputElement>(`[name="${inp.label}"]`);
        if (input && getActiveEl(document) !== input) {
          const val = isFunc(inp.value) ? inp.value() : inp.value;
          if (val != null) input.value = String(val);
        }
      });
    } else {
      const input = this.form.elements[0] as HTMLInputElement;
      if (this.item.getValue && getActiveEl(document) !== input) input.value = String(this.item.getValue() || "");
    }
  }
}

WidgetRegistry.register("input", InputWidget);
