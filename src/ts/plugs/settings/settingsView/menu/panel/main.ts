import { BaseMenuPanel } from ".";
import { SettingsMenu } from "../";
import type { SettingsMenuItem, SettingsMenuConfig, SettingsRowElement } from "../../types";
import { createEl, createListRenderer } from "@utils/dom";
import { WidgetRegistry } from "../widgets";
import type { Controller } from "@core/controller";
import { IconRegistry } from "@core/registries";
import { isFunc, parseUIOpt, parseUIBadge, isArr } from "@utils/obj";
import { requestAnimationFrame } from "@utils/fn";

export class MainMenuPanel extends BaseMenuPanel {
  private viewBtn!: HTMLButtonElement;
  private renderRows!: ReturnType<typeof createListRenderer<SettingsMenuItem>>;
  public onItemClick?: (item: SettingsMenuItem) => void;
  public onViewClick?: () => void;

  constructor(ctlr: Controller, private readonly menuConfig: SettingsMenuConfig) {
    super(ctlr, undefined, "tmg-media-smenu-main-panel");
  }

  protected override onSetup() {}
  protected override onDestroy() {
    this.renderRows?.([]);
  }

  public build(): void {
    const list = createEl("ul", { className: "tmg-media-smenu-main-list", role: "menu" });
    this.renderRows = createListRenderer<SettingsMenuItem>({
      container: list,
      getKey: (item) => item.id,
      createNode: (item) => this.buildRow(item),
      destroyNode: (node) => ((node as any)._ac?.abort(), (node as SettingsRowElement).widget?.destroy(), node.remove()),
    });
    this.content.append(list);
    if (this.menuConfig.showView) {
      this.viewBtn = createEl("button", { type: "button", className: "tmg-media-smenu-view-btn", innerHTML: `<span class="tmg-media-smenu-row-icon">${IconRegistry.get("returnBack")}</span><span class="tmg-media-smenu-view-label">See More</span>` });
      this.viewBtn.addEventListener("click", () => this.onViewClick?.()), this.content.append(createEl("div", { className: "tmg-media-smenu-divider" }), this.viewBtn);
      this.ctlr.plug("settings.settingsView")?.state.on("viewOpen", ({ value }, lbl = this.viewBtn?.querySelector(".tmg-media-smenu-view-label")) => lbl && (lbl.textContent = value ? "Hide More" : "See More"), { init: true, signal: this.signal });
    }
  }

  public sync(items: SettingsMenuItem[]): void {
    this.renderRows(items);
  }
  public override enter(dir?: "forward" | "backward" | "none"): void {
    super.enter(dir), this.focusFirst();
  }
  private focusFirst(): void {
    requestAnimationFrame(() => this.element.querySelector<HTMLElement>(SettingsMenu.focusSelector)?.focus(), this.ctlr.signal);
  }

  private buildRow(item: SettingsMenuItem): HTMLElement {
    const isWidget = item.widget === "toggle" || item.widget === "button" || item.inline,
      li = createEl("li", { className: "tmg-media-smenu-row" + (item.getDisabled?.() ? " tmg-media-control-disabled" : ""), role: "menuitem", tabIndex: 0, inert: item.getDisabled?.() || undefined }, { itemId: item.id }) as SettingsRowElement,
      lbl = createEl("span", { className: "tmg-media-smenu-row-label", textContent: item.label });
    if (item.title) li.title = isFunc(item.title) ? item.title() : item.title;
    if (item.icon) {
      const iconSvg = IconRegistry.get(item.icon, true);
      if (iconSvg) li.append(createEl("span", { className: "tmg-media-smenu-row-icon", innerHTML: iconSvg }));
    }
    if (isWidget) {
      const badge = parseUIBadge(item.getBadge?.());
      if (badge?.label) lbl.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.label }));
      const widget = WidgetRegistry.create(item, this.ctlr);
      if (widget) {
        const el = widget.render();
        if (badge?.value) el.dataset.badge = badge.value;
        item.inline && item.widget !== "toggle" ? (li.removeAttribute("tabindex"), li.classList.replace("tmg-media-smenu-row", "tmg-media-smenu-inline-wrapper"), li.append(el), item.widget === "range" && li.classList.add("tmg-media-smenu-row-inline-block")) : (li.append(lbl, el), li.classList.add("tmg-media-smenu-row-inline"));
        li.widget = widget;
        li.addEventListener("click", (e) => !item.getDisabled?.() && (e.target === li || e.target === lbl) && li.querySelector<HTMLElement>("input, button")?.click());
      } else li.append(lbl);
    } else {
      const value = item.getValue?.(),
        opts = /^(select|drag-select)$/.test(item.widget as string) && !item.getMultiple?.() ? item.getOptions?.() : undefined,
        badge = parseUIBadge(item.getBadge?.() || (opts?.find((o, _, __, parsed = parseUIOpt(o)) => parsed.display === value || parsed.value === value) as any)?.badge),
        val = createEl("span", { className: "tmg-media-smenu-row-value" });
      if (badge?.label) lbl.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.label }));
      val.append(createEl("span", { className: "tmg-media-smenu-text", textContent: isArr(value) ? value.join(", ") : value || "" }));
      if (badge?.value) val.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.value }));
      if (item.infoText) {
        const info = createEl("span", { className: "tmg-media-smenu-row-info" });
        info.append(createEl("span", { className: "tmg-media-smenu-text", textContent: isFunc(item.infoText) ? item.infoText() : item.infoText }));
        li.append(lbl, info, val, createEl("span", { className: "tmg-media-smenu-row-arrow", ariaHidden: "true", innerHTML: "&#8250;" }));
      } else li.append(lbl, val, createEl("span", { className: "tmg-media-smenu-row-arrow", ariaHidden: "true", innerHTML: "&#8250;" }));
      li.addEventListener("click", () => !item.getDisabled?.() && this.onItemClick?.(item));
      if (item.mediaPaths || item.configPaths || item.onWire) {
        const ac = new AbortController(),
          syncUI = () => {
            const value = item.getValue?.(),
              opts = /^(select|drag-select)$/.test(item.widget as string) && !item.getMultiple?.() ? item.getOptions?.() : undefined,
              badge = parseUIBadge(item.getBadge?.() || (opts?.find((o, _, __, parsed = parseUIOpt(o)) => parsed.display === value || parsed.value === value) as any)?.badge),
              valNode = li.querySelector<HTMLElement>(".tmg-media-smenu-row-value"),
              lblNode = li.querySelector<HTMLElement>(".tmg-media-smenu-row-label");
            if (lblNode) {
              lblNode.querySelector(".tmg-media-control-badge")?.remove();
              if (badge?.label) lblNode.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.label }));
            }
            if (valNode) {
              valNode.textContent = "";
              valNode.append(createEl("span", { className: "tmg-media-smenu-text", textContent: isArr(value) ? value.join(", ") : value || "" }));
              if (badge?.value) valNode.append(createEl("span", { className: "tmg-media-control-badge", textContent: badge.value }));
            } else {
              const el = (li as SettingsRowElement).widget?.element;
              if (el) badge?.value ? (el.dataset.badge = badge.value) : delete el.dataset.badge;
              (li as SettingsRowElement).widget?.syncUI();
            }
            (li.inert = !!item.getDisabled?.()), li.classList.toggle("tmg-media-control-disabled", !!item.getDisabled?.());
          };
        if (item.mediaPaths) for (const path of item.mediaPaths || []) this.media.on(path, syncUI, { signal: ac.signal });
        if (item.configPaths) for (const path of item.configPaths || []) this.ctlr.config.on(path, syncUI, { signal: ac.signal });
        item.onWire?.(syncUI, ac.signal);
        (li as any)._ac = ac;
      }
    }
    return li;
  }
}
