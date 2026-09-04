import type { SettingsMenuItem, SettingsRowElement } from "../../types";
import { BaseWidget, WidgetRegistry } from ".";
import { createEl, createListRenderer } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import { isFunc, parseUIOpt, parseUIBadge, isArr } from "@utils/obj";

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

  protected override onSetup(): void {
    super.onSetup();
    const cPaths = new Set<string>(),
      mPaths = new Set<string>();
    for (const sub of this.item?.items ?? []) {
      if (sub.configPaths) for (const p of sub.configPaths) cPaths.add(p as string);
      if (sub.mediaPaths) for (const p of sub.mediaPaths) mPaths.add(p as string);
    }
    for (const p of cPaths) this.ctlr.config.on(p as any, this.syncUI, { signal: this.signal });
    for (const p of mPaths) this.media.on(p as any, this.syncUI, { signal: this.signal });
  }

  public override syncUI(): void {
    if (!this.renderRows || !this.item) return;
    const active = (this.item.items ?? []).filter((sub) => {
      if (this.settings.settingsView.menu.blacklist.includes(sub.id)) return false;
      if (isFunc(sub.hidden) ? sub.hidden() : sub.hidden) return false;
      return !sub.feature || this.media.features[sub.feature] === true;
    });
    this.renderRows(active);
    for (const sub of active) {
      const li = this.element.querySelector<SettingsRowElement>(`.tmg-media-smenu-group-row[data-sub-id="${sub.id}"]`);
      if (li) {
        const value = sub.getValue?.(),
          opts = /^(select|drag-select)$/.test(sub.widget as string) && !sub.getMultiple?.() ? sub.getOptions?.() : undefined,
          badge = parseUIBadge(sub.getBadge?.() || (opts?.find((o, _, __, parsed = parseUIOpt(o)) => parsed.display === value || parsed.value === value) as any)?.badge);
        const valNode = li.querySelector<HTMLElement>(".tmg-media-smenu-group-value");
        const lblNode = li.querySelector<HTMLElement>(".tmg-media-smenu-group-label");
        if (lblNode) {
          lblNode.textContent = sub.label;
          if (badge?.label) lblNode.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.label }));
        }
        if (valNode) {
          valNode.textContent = isArr(value) ? value.join(", ") : value || "";
          if (badge?.value) valNode.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.value }));
        } else {
          const el = li.widget?.element;
          if (el) badge?.value ? (el.dataset.badge = badge.value) : delete el.dataset.badge;
          li.widget?.syncUI();
        }
      }
    }
  }

  private buildRow(sub: SettingsMenuItem): HTMLElement {
    const isWidget = sub.widget === "toggle" || sub.inline,
      disabled = sub.getDisabled?.() ?? (/^(select|drag-select)$/.test(sub.widget as string) && sub.getOptions?.()?.length === 0),
      li = createEl("li", { className: "tmg-media-smenu-group-row" + (disabled ? " tmg-media-control-disabled" : ""), tabIndex: 0, inert: disabled || undefined }, { subId: sub.id }) as SettingsRowElement,
      lbl = createEl("span", { className: "tmg-media-smenu-group-label", textContent: sub.label });
    if (sub.title) li.title = isFunc(sub.title) ? sub.title() : sub.title;
    if (sub.icon) {
      const iconSvg = IconRegistry.get(sub.icon, true);
      if (iconSvg) li.append(createEl("span", { className: "tmg-media-smenu-group-icon", innerHTML: iconSvg }));
    }
    if (isWidget) {
      const badge = parseUIBadge(sub.getBadge?.());
      if (badge?.label) lbl.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.label }));
      const widget = WidgetRegistry.create(sub, this.ctlr);
      if (widget) {
        const el = widget.render();
        if (badge?.value) el.dataset.badge = badge.value;
        sub.inline && sub.widget !== "toggle" ? (li.removeAttribute("tabindex"), li.classList.replace("tmg-media-smenu-group-row", "tmg-media-smenu-inline-wrapper"), li.append(el), sub.widget === "range" && li.classList.add("tmg-media-smenu-row-inline-block")) : (li.append(lbl, el), li.classList.add("tmg-media-smenu-row-inline"));
        li.widget = widget;
        li.addEventListener("click", (e) => !disabled && (e.target === li || e.target === lbl) && li.querySelector<HTMLElement>("input, button")?.click());
      } else li.append(lbl);
    } else {
      const value = sub.getValue?.(),
        opts = /^(select|drag-select)$/.test(sub.widget as string) && !sub.getMultiple?.() ? sub.getOptions?.() : undefined,
        badge = parseUIBadge(sub.getBadge?.() || (opts?.find((o, _, __, parsed = parseUIOpt(o)) => parsed.display === value || parsed.value === value) as any)?.badge),
        val = createEl("span", { className: "tmg-media-smenu-group-value", textContent: isArr(value) ? value.join(", ") : value || "" });

      if (badge?.label) lbl.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.label }));
      if (badge?.value) val.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.value }));

      sub.widget !== "button" ? li.append(lbl, val, createEl("span", { className: "tmg-media-smenu-group-arrow", ariaHidden: "true", innerHTML: "&#8250;" })) : li.append(lbl);
      li.addEventListener("click", () => !disabled && (sub.widget === "button" ? sub.onChange?.(null) : this.onSubItemClick?.(sub)));
      if (sub.onWire) {
        const ac = new AbortController(),
          syncUI = () => {
            const value = sub.getValue?.(),
              opts = /^(select|drag-select)$/.test(sub.widget as string) && !sub.getMultiple?.() ? sub.getOptions?.() : undefined,
              badge = parseUIBadge(sub.getBadge?.() || (opts?.find((o, _, __, parsed = parseUIOpt(o)) => parsed.display === value || parsed.value === value) as any)?.badge),
              valNode = li.querySelector<HTMLElement>(".tmg-media-smenu-group-value");
            const lblNode = li.querySelector<HTMLElement>(".tmg-media-smenu-group-label");
            if (lblNode) {
              lblNode.textContent = sub.label;
              if (badge?.label) lblNode.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.label }));
            }
            if (valNode) {
              valNode.textContent = isArr(value) ? value.join(", ") : value || "";
              if (badge?.value) valNode.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.value }));
            } else {
              const el = (li as SettingsRowElement).widget?.element;
              if (el) badge?.value ? (el.dataset.badge = badge.value) : delete el.dataset.badge;
              (li as SettingsRowElement).widget?.syncUI();
            }
            (li.inert = !!sub.getDisabled?.()), li.classList.toggle("tmg-media-control-disabled", !!sub.getDisabled?.());
          };
        sub.onWire?.(syncUI, ac.signal);
        (li as any)._ac = ac;
      }
    }
    return li;
  }
}

WidgetRegistry.register("group", GroupWidget);
