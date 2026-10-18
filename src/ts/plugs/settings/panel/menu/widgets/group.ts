import type { SettingsMenuItem, SettingsRowEl } from "../types";
import { BaseWidget, WidgetRegistry } from ".";
import { createEl, createListRenderer } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import { isFunc, parseUIOpt, parseUIBadge, isArr, isObj } from "@utils/obj";

export class GroupWidget extends BaseWidget {
  private renderRows!: ReturnType<typeof createListRenderer<SettingsMenuItem, SettingsRowEl>>;
  public onSubItemClick?: (item: SettingsMenuItem) => void;

  public override render(): HTMLElement {
    this.element = createEl("ul", { className: "tmg-media-smenu-group-list" });
    this.renderRows = createListRenderer<SettingsMenuItem, SettingsRowEl>({ container: this.element, getKey: (sub) => sub.id, createNode: this.buildRow, updateNode: this.updateRow, destroyNode: (node) => (node._ac?.abort(), node.widget?.destroy(), node.remove()) });
    return this.syncUI(), this.element;
  }

  protected override onSetup(): void {
    super.onSetup();
    for (const sub of this.item.items ?? [])
      if (isObj(sub.hidden)) {
        if (sub.hidden.configPaths) for (const p of sub.hidden.configPaths) this.ctlr.config.on(p as any, this.syncUI, { signal: this.signal });
        if (sub.hidden.mediaPaths) for (const p of sub.hidden.mediaPaths) this.media.on(p as any, this.syncUI, { signal: this.signal });
      }
  }
  protected override onDestroy(): void {
    this.renderRows?.([]);
  }

  public override syncUI(): void {
    if (!this.renderRows || !this.item) return;
    const active = (this.item.items ?? []).filter((sub) => {
      if (this.settings.panel.menu.blacklist.includes(sub.id) || sub.hidden === true || (sub.hidden && sub.hidden.is())) return false;
      return !sub.feature || !!this.media.features[sub.feature];
    });
    this.renderRows(active);
  }

  private buildRow(sub: SettingsMenuItem): HTMLElement {
    const isWidget = sub.widget === "toggle" || sub.inline,
      li = createEl("li", { className: "tmg-media-smenu-group-row", tabIndex: 0, role: "menuitem" }, { subId: sub.id, label: sub.label }) as SettingsRowEl,
      lbl = createEl("span", { className: "tmg-media-smenu-group-label", textContent: sub.label });
    if (sub.title) li.title = isFunc(sub.title) ? sub.title() : sub.title;
    if (sub.icon) {
      const iconSvg = IconRegistry.get(sub.icon, true);
      if (iconSvg) li.append(createEl("span", { className: "tmg-media-smenu-group-icon tmg-media-flex-center", innerHTML: iconSvg }));
    }
    if (isWidget) {
      const widget = WidgetRegistry.create(sub, this.ctlr);
      if (widget) {
        const el = widget.render();
        sub.inline && sub.widget !== "toggle" ? (li.removeAttribute("tabindex"), li.classList.replace("tmg-media-smenu-group-row", "tmg-media-smenu-inline-wrapper"), li.append(el), sub.widget === "range" && li.classList.add("tmg-media-smenu-row-inline-block")) : (li.append(lbl, el), li.classList.add("tmg-media-smenu-row-inline"));
        li.widget = widget;
        li.addEventListener("click", (e) => !li.hasAttribute("disabled") && (e.target === li || e.target === lbl) && li.querySelector<HTMLElement>("input, button")?.click(), { signal: this.signal });
      } else li.append(lbl);
    } else {
      sub.widget !== "button" ? li.append(lbl, createEl("span", { className: "tmg-media-smenu-group-value" }), createEl("span", { className: "tmg-media-smenu-group-arrow", ariaHidden: "true", innerHTML: "&#8250;" })) : li.append(lbl);
      li.addEventListener("click", () => !li.hasAttribute("disabled") && (sub.widget === "button" ? sub.onChange?.(null) : this.onSubItemClick?.(sub)), { signal: this.signal });
    }
    this.updateRow(li, sub);
    if (sub.configPaths || sub.mediaPaths || sub.onWire) {
      const ac = new AbortController(),
        syncUI = () => this.updateRow(li, sub);
      if (sub.configPaths) for (const p of sub.configPaths) this.ctlr.config.on(p as any, syncUI, { signal: ac.signal });
      if (sub.mediaPaths) for (const p of sub.mediaPaths) this.media.on(p as any, syncUI, { signal: ac.signal });
      sub.onWire?.(syncUI, ac.signal);
      li._ac = ac;
    }
    return li;
  }

  private updateRow(li: SettingsRowEl, sub: SettingsMenuItem): void {
    const value = sub.getValue?.(),
      opts = /^(select|drag-select)$/.test(sub.widget as string) && !sub.getMultiple?.() ? sub.getOptions?.() : undefined,
      badge = parseUIBadge(sub.getBadge?.() || (opts?.find((o, _, __, parsed = parseUIOpt(o)) => parsed.display === value || parsed.value === value) as any)?.badge),
      valNode = li.querySelector<HTMLElement>(".tmg-media-smenu-group-value"),
      lblNode = li.querySelector<HTMLElement>(".tmg-media-smenu-group-label");
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
    const disabled = sub.getDisabled?.() ?? (/^(select|drag-select)$/.test(sub.widget as string) && sub.getOptions?.()?.length === 0);
    (li.inert = disabled), li.toggleAttribute("disabled", disabled);
  }
}

WidgetRegistry.register("group", GroupWidget);
