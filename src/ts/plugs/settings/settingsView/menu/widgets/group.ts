import type { SettingsMenuItem, SettingsRowElement } from "../../types";
import { BaseWidget, WidgetRegistry } from ".";
import { createEl, createListRenderer } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import { isFunc } from "../../../../../super/utils";

export class GroupWidget extends BaseWidget {
  private renderRows!: ReturnType<typeof createListRenderer<SettingsMenuItem>>;
  public onSubItemClick?: (item: SettingsMenuItem) => void;

  public override render(): HTMLElement {
    this.element = createEl("ul", { className: "tmg-media-smenu-group-list" });
    this.renderRows = createListRenderer<SettingsMenuItem>({
      container: this.element,
      getKey: (sub) => sub.id,
      createNode: (item) => this.buildRow(item),
      destroyNode: (node) => ((node as any)._ac?.abort(), (node as SettingsRowElement).widget?.destroy(), node.remove()),
    });
    return this.syncUI(), this.element;
  }

  public override syncUI(): void {
    const active = (this.item.items ?? []).filter((sub) => {
      if (isFunc(sub.hidden) ? sub.hidden() : sub.hidden) return false;
      return !sub.feature || Boolean(this.media.features[sub.feature]);
    });
    this.renderRows(active);
    active.forEach((sub) => {
      const li = this.element.querySelector<SettingsRowElement>(`.tmg-media-smenu-group-row[data-sub-id="${sub.id}"]`);
      if (li) {
        const valNode = li.querySelector<HTMLElement>(".tmg-media-smenu-group-value");
        valNode ? (valNode.textContent = sub.getValue?.() || "") : li.widget?.syncUI();
      }
    });
  }

  private buildRow(sub: SettingsMenuItem): HTMLElement {
    const isWidget = sub.widget === "toggle" || sub.inline,
      disabled = sub.getDisabled?.() ?? (["select", "drag-select"].includes(sub.widget as string) && sub.getOptions?.()?.length === 0),
      li = createEl("li", { className: "tmg-media-smenu-group-row" + (disabled ? " tmg-media-control-disabled" : ""), tabIndex: 0, inert: disabled || undefined }, { subId: sub.id }) as SettingsRowElement,
      lbl = createEl("span", { className: "tmg-media-smenu-group-label", textContent: sub.label });
    if (sub.title) li.title = isFunc(sub.title) ? sub.title() : sub.title;
    if (sub.icon) {
      const iconSvg = IconRegistry.get(sub.icon, true);
      if (iconSvg) li.append(createEl("span", { className: "tmg-media-smenu-group-icon", innerHTML: iconSvg }));
    }
    if (isWidget) {
      const widget = WidgetRegistry.create(sub, this.ctlr);
      if (widget) {
        sub.inline && sub.widget !== "toggle" ? (li.removeAttribute("tabindex"), li.classList.replace("tmg-media-smenu-group-row", "tmg-media-smenu-inline-wrapper"), li.append(widget.render()), sub.widget === "range" && li.classList.add("tmg-media-smenu-row-inline-block")) : (li.append(lbl, widget.render()), li.classList.add("tmg-media-smenu-row-inline"));
        li.widget = widget;
        li.addEventListener("click", (e) => !disabled && (e.target === li || e.target === lbl) && li.querySelector<HTMLElement>("input, button")?.click());
      } else li.append(lbl);
    } else {
      const val = createEl("span", { className: "tmg-media-smenu-group-value", textContent: sub.getValue() || "" });
      sub.widget !== "button" ? li.append(lbl, val, createEl("span", { className: "tmg-media-smenu-group-arrow", ariaHidden: "true", innerHTML: "&#8250;" })) : li.append(lbl);
      li.addEventListener("click", () => !disabled && (sub.widget === "button" ? sub.onChange?.(null) : this.onSubItemClick?.(sub)));
      if (sub.mediaPaths || sub.configPaths || sub.onWire) {
        const ac = new AbortController(),
          syncUI = () => {
            const valNode = li.querySelector<HTMLElement>(".tmg-media-smenu-group-value");
            valNode ? (valNode.textContent = sub.getValue() || "") : (li as SettingsRowElement).widget?.syncUI();
            const _d = sub.getDisabled?.() ?? (["select", "drag-select"].includes(sub.widget as string) && sub.getOptions?.()?.length === 0);
            (li.inert = !!_d), li.classList.toggle("tmg-media-control-disabled", !!_d);
          };
        sub.mediaPaths?.forEach((path) => this.media.on(path, syncUI, { signal: ac.signal }));
        sub.configPaths?.forEach((path) => this.ctlr.config.on(path, syncUI, { signal: ac.signal }));
        sub.onWire?.(syncUI, ac.signal);
        (li as any)._ac = ac;
      }
    }
    return li;
  }
}

WidgetRegistry.register("group", GroupWidget);
