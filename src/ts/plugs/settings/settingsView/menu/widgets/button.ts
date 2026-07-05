import { BaseWidget, WidgetRegistry } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class ButtonWidget extends BaseWidget {
  public override render(): HTMLElement {
    this.element = createEl("ul", { className: "tmg-media-smenu-select-list", role: "listbox" });
    const actions = this.item.actions || [{ getLabel: () => this.item.label, icon: this.item.icon, onClick: () => this.item.onChange?.(null) }];
    for (const action of actions) {
      const btn = createEl("li", { className: "tmg-media-smenu-select-option", role: "option", ariaLabel: action.getLabel(), title: action.getLabel(), tabIndex: 0 });
      btn.innerHTML = (action.icon ? `<span class="tmg-media-smenu-row-icon">${IconRegistry.get(action.icon, true) || ""}</span>` : "") + `<span class="tmg-media-smenu-row-label">${action.getLabel()}</span>`;
      btn.addEventListener("click", (e) => (e.stopPropagation(), action.onClick()));
      btn.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), action.onClick()));
      this.element.append(btn);
    }
    return this.element;
  }
  public override syncUI(): void {}
}

WidgetRegistry.register("button", ButtonWidget);
