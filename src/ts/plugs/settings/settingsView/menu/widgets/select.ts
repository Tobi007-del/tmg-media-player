import { UITuple } from "@defs/UIOptions";
import { BaseWidget, WidgetRegistry } from ".";
import { createEl, createListRenderer } from "@utils/dom";
import { parseUIOpt } from "@utils/obj";

export class SelectWidget<T = unknown> extends BaseWidget<T> {
  private renderRows!: ReturnType<typeof createListRenderer<UITuple<T>>>;
  private currentValue: string | string[] = "";

  public override render(): HTMLElement {
    this.element = createEl("ul", { className: "tmg-media-smenu-select-list", role: "listbox" });
    this.renderRows = createListRenderer<UITuple<T>>({
      container: this.element,
      getKey: (opt) => opt.value as string,
      createNode: (opt) => {
        const li = createEl("li", { className: "tmg-media-smenu-select-option", role: "option", tabIndex: 0, title: opt.title }, { optVal: opt.value as string }),
          check = createEl("span", { className: "tmg-media-smenu-select-check", ariaHidden: "true" }),
          label = createEl("span", { className: "tmg-media-smenu-select-label", textContent: opt.display });
        li.append(check, label), opt.infoText && li.append(createEl("span", { className: "tmg-media-smenu-select-info", textContent: opt.infoText }));
        li.addEventListener("click", () => {
          const isMulti = this.item.getMultiple?.();
          if (!isMulti && (label.textContent === this.currentValue || li.dataset.optVal === this.currentValue)) return;
          this.item.onChange?.(opt.value);
          this.currentValue = isMulti ? this.item.getValue() || [] : label.textContent!;
          this.syncActive();
        });
        return li;
      },
      updateNode: (node, opt) => {
        node.querySelector<HTMLElement>(".tmg-media-smenu-select-label")!.textContent = opt.display;
        opt.title ? (node.title = opt.title) : node.removeAttribute("title");
        const infoNode = node.querySelector<HTMLElement>(".tmg-media-smenu-select-info");
        opt.infoText ? (infoNode ? (infoNode.textContent = opt.infoText) : node.append(createEl("span", { className: "tmg-media-smenu-select-info", textContent: opt.infoText }))) : infoNode?.remove();
        node.dataset.optVal = opt.value as string;
        const isMulti = this.item.getMultiple?.(),
          vals = isMulti ? (Array.isArray(this.currentValue) ? this.currentValue : [this.currentValue]) : [this.currentValue];
        node.ariaSelected = String(vals.includes(opt.display) || vals.includes(node.dataset.optVal));
      },
    });
    return this.syncUI(), this.element;
  }

  public override syncUI(): void {
    this.currentValue = this.item.getValue() || (this.item.getMultiple?.() ? [] : "");
    this.renderRows((this.item.getOptions?.() ?? []).map((o) => parseUIOpt(o)));
    this.syncActive();
  }

  private syncActive(): void {
    const isMulti = this.item.getMultiple?.(),
      vals = isMulti ? (Array.isArray(this.currentValue) ? this.currentValue : [this.currentValue]) : [this.currentValue];
    for (const li of this.element.querySelectorAll<HTMLElement>("[data-opt-val]")) {
      const active = vals.includes(li.querySelector(".tmg-media-smenu-select-label")!.textContent!) || vals.includes(li.dataset.optVal!);
      li.classList.toggle("tmg-media-smenu-option-active", active), (li.ariaSelected = String(active));
    }
  }
}

WidgetRegistry.register("select", SelectWidget);
