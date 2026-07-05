import { BaseMenuPanel } from ".";
import type { SettingsMenuItem } from "../../types";
import { BaseWidget, WidgetRegistry } from "../widgets";
import { GroupWidget } from "../widgets/group";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";
import type { Controller } from "@core/controller";
import { isFunc } from "@utils/obj";
import { requestAnimationFrame } from "@utils/fn";

export class SubMenuPanel extends BaseMenuPanel {
  private headerLabel!: HTMLElement;
  private widgetSlot!: HTMLElement;
  private backBtn!: HTMLButtonElement;
  private widget: BaseWidget | null = null;
  private item: SettingsMenuItem | null = null;
  private headerActions!: HTMLElement;
  private footerSlot!: HTMLElement;
  public onBack?: () => void;
  public onSubItemClick?: (item: SettingsMenuItem) => void;

  constructor(ctlr: Controller) {
    super(ctlr, undefined, "tmg-media-smenu-sub-panel");
  }

  protected override onSetup(): void {
    this.buildShell();
  }

  private buildShell(): void {
    const header = createEl("div", { className: "tmg-media-smenu-sub-header" });
    this.backBtn = createEl("button", { type: "button", className: "tmg-media-smenu-back-btn", ariaLabel: "Back", innerHTML: `<span class="tmg-media-smenu-back-arrow">&#8249;</span>`, tabIndex: 0 });
    this.headerLabel = createEl("span", { className: "tmg-media-smenu-sub-title", tabIndex: -1 });
    this.backBtn.addEventListener("click", (e) => (e.stopPropagation(), this.onBack?.()));
    header.addEventListener("click", () => this.onBack?.());
    this.headerActions = createEl("div", { className: "tmg-media-smenu-sub-actions" });
    header.append(this.backBtn, this.headerLabel, this.headerActions);
    this.widgetSlot = createEl("div", { className: "tmg-media-smenu-widget-slot" });
    this.footerSlot = createEl("div", { className: "tmg-media-smenu-sub-footer" });
    this.content.append(header, this.widgetSlot, this.footerSlot);
  }

  public override enter(dir?: "forward" | "backward" | "none") {
    super.enter(dir), requestAnimationFrame(() => this.element.querySelector<HTMLElement>(":is([tabindex='0'], button:not([disabled]), input:not([type='checkbox'], [type='radio'], [disabled])):not(.tmg-media-smenu-back-btn, .tmg-media-range-container)")?.focus(), this.ctlr.signal);
  }

  public load(item: SettingsMenuItem): void {
    this.headerLabel.textContent = item.label;
    if (this.item?.id === item.id) return void this.widget?.syncUI();
    if (this.widget) this.widget.element?.remove(), this.widget.destroy();
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
        if (action.id === "delete" || action.icon === "delete") btn.classList.add("tmg-media-smenu-delete-btn");
        action.icon ? (btn.innerHTML = IconRegistry.get(action.icon, true) || label) : (btn.textContent = label);
        btn.addEventListener("click", (e) => (e.stopPropagation(), action.onClick()));
        this.headerActions.append(btn);
      }
    }
    // Populate footer
    this.footerSlot.innerHTML = "";
    if (item.tipHTML) this.footerSlot.innerHTML = isFunc(item.tipHTML) ? item.tipHTML() : item.tipHTML;
    if (item.footerActions?.length) {
      const actionsWrap = createEl("div", { className: "tmg-media-smenu-footer-actions" });
      for (const action of item.footerActions) {
        const btn = createEl("button", { className: "tmg-media-smenu-input-btn", type: "button", textContent: action.getLabel() });
        btn.addEventListener("click", () => action.onClick()), actionsWrap.append(btn);
      }
      this.footerSlot.append(actionsWrap);
    }
  }

  public syncUI(): void {
    this.widget?.syncUI();
    if (this.item?.footerActions?.length) {
      const btns = this.footerSlot.querySelectorAll("button");
      this.item.footerActions.forEach((action, i) => btns[i] && (btns[i].textContent = action.getLabel()));
    }
    if (this.item?.actions?.length) {
      const btns = this.headerActions.querySelectorAll("button");
      this.item.actions.forEach((action, i) => {
        if (!btns[i]) return;
        const lbl = action.getLabel();
        btns[i].innerHTML = action.icon ? IconRegistry.get(action.icon, true) || lbl : lbl;
      });
    }
  }

  public get activeId(): string | null {
    return this.item?.id ?? null;
  }
}
