import { BaseMenuPanel } from ".";
import type { SettingsMenuItem } from "../../types";
import { BaseWidget, WidgetRegistry } from "../widgets";
import { GroupWidget } from "../widgets/group";
import { createEl, addSafeClicks } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import type { Controller } from "@core/controller";

export class SubMenuPanel extends BaseMenuPanel {
  private headerLabel!: HTMLElement;
  private widgetSlot!: HTMLElement;
  private backBtn!: HTMLButtonElement;
  private widget: BaseWidget | null = null;
  private item: SettingsMenuItem | null = null;
  private headerActions!: HTMLElement;
  private footerSlot!: HTMLElement;
  public onBack?: (restore?: boolean) => void;
  public onSubItemClick?: (item: SettingsMenuItem) => void;

  constructor(ctlr: Controller) {
    super(ctlr, undefined, "tmg-media-smenu-sub-panel");
  }

  protected override onSetup(): void {
    this.buildShell();
  }

  protected override onDestroy(): void {
    this.widget?.destroy();
  }

  private buildShell(): void {
    const header = createEl("div", { className: "tmg-media-smenu-sub-header" });
    this.backBtn = createEl("button", { type: "button", className: "tmg-media-smenu-back-btn", ariaLabel: "Back", title: "Back ↔ Double click→with history", innerHTML: `<span class="tmg-media-smenu-back-arrow">${IconRegistry.get("goBack", true) || "&#8249;"}</span>`, tabIndex: 0 });
    this.headerLabel = createEl("span", { className: "tmg-media-smenu-sub-title", tabIndex: -1 });
    addSafeClicks(
      this.backBtn,
      (e) => (e.stopPropagation(), this.onBack?.(false)),
      (e) => (e.stopPropagation(), this.onBack?.(true)),
      { signal: this.signal }
    );
    addSafeClicks(
      this.headerLabel,
      (e) => (e.stopPropagation(), this.onBack?.(false)),
      (e) => (e.stopPropagation(), this.onBack?.(true)),
      { signal: this.signal }
    );
    this.headerActions = createEl("div", { className: "tmg-media-smenu-sub-actions" });
    header.append(this.backBtn, this.headerLabel, this.headerActions);
    this.widgetSlot = createEl("div", { className: "tmg-media-smenu-widget-slot" });
    this.footerSlot = createEl("div", { className: "tmg-media-smenu-sub-footer" });
    this.content.append(header, this.widgetSlot, this.footerSlot);
  }

  public override enter(dir?: "forward" | "backward" | "none", restore = false) {
    super.enter(dir, restore), !restore && this.focusFirst();
  }

  public load(item: SettingsMenuItem): void {
    this.headerLabel.textContent = item.label;
    if (this.item?.id === item.id) return void this.syncUI();
    if (this.widget) this.widget.element?.remove(), this.widget.destroy(), this.widget = null;
    this.item = item;
    const widget = WidgetRegistry.create(item, this.ctlr);
    if (!widget) return;
    if (widget instanceof GroupWidget) widget.onSubItemClick = (sub) => this.onSubItemClick?.(sub);
    this.widget = widget;
    this.widgetSlot.append(widget.render());
    // Populate actions
    this.headerActions.innerHTML = "";
    if (item.actions) {
      for (const action of item.actions) {
        const label = action.getLabel(),
          btn = createEl("button", { className: "tmg-media-smenu-sub-action-btn" + (!action.icon ? " tmg-media-smenu-input-btn tmg-media-smenu-text-action" : ""), type: "button", ariaLabel: label, title: label });
        if (action.id) btn.classList.add(`tmg-media-smenu-${action.id}-btn`);
        action.icon ? (btn.innerHTML = IconRegistry.get(action.icon, true) || label) : (btn.textContent = label);
        if (action.getDisabled) btn.disabled = action.getDisabled();
        if (action.hidden) btn.style.display = action.hidden() ? "none" : "";
        btn.addEventListener("click", (e) => (e.stopPropagation(), action.onClick()), { signal: this.signal });
        this.headerActions.append(btn);
      }
    }
    // Populate footer
    this.footerSlot.innerHTML = "";
    if (item.getTipHTML) this.footerSlot.innerHTML = item.getTipHTML();
    if (item.footerActions?.length) {
      const actionsWrap = createEl("div", { className: "tmg-media-smenu-footer-actions" });
      for (const action of item.footerActions) {
        const btn = createEl("button", { className: "tmg-media-smenu-input-btn", type: "button", textContent: action.getLabel() });
        if (action.getDisabled) btn.disabled = action.getDisabled();
        if (action.hidden) btn.style.display = action.hidden() ? "none" : "";
        btn.addEventListener("click", () => action.onClick(), { signal: this.signal }), actionsWrap.append(btn);
      }
      this.footerSlot.append(actionsWrap);
    }
  }

  public syncUI(): void {
    this.widget?.syncUI();
    if (this.item?.footerActions?.length) {
      const btns = this.footerSlot.querySelectorAll<HTMLButtonElement>("button");
      this.item.footerActions.forEach((action, i) => {
        if (!btns[i]) return;
        btns[i].textContent = action.getLabel();
        if (action.getDisabled) btns[i].disabled = action.getDisabled();
        if (action.hidden) btns[i].style.display = action.hidden() ? "none" : "";
      });
    }
    if (this.item?.actions?.length) {
      const btns = this.headerActions.querySelectorAll<HTMLButtonElement>("button");
      this.item.actions.forEach((action, i) => {
        if (!btns[i]) return;
        btns[i].innerHTML = action.icon ? IconRegistry.get(action.icon, true) || action.getLabel() : action.getLabel();
        if (action.getDisabled) btns[i].disabled = action.getDisabled();
        if (action.hidden) btns[i].style.display = action.hidden() ? "none" : "";
      });
    }
    if (this.item?.getTipHTML) {
      const actionsWrap = this.footerSlot.querySelector<HTMLElement>(".tmg-media-smenu-footer-actions");
      actionsWrap?.remove();
      this.footerSlot.innerHTML = this.item.getTipHTML();
      if (actionsWrap) this.footerSlot.append(actionsWrap);
    }
  }

  public get activeId(): string | null {
    return this.item?.id ?? null;
  }
}
