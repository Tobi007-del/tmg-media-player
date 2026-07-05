import { BaseComponent, type ComponentState } from "@components/base";
import { CTX } from "sia-reactor";
import type { SettingsMenuItem, SettingsMenuConfig } from "../types";
import { MainMenuPanel } from "./panel/main";
import { SubMenuPanel } from "./panel/sub";
import type { BaseMenuPanel, PanelDir } from "./panel";
import { createEl } from "@utils/dom";
import { getActiveEl, isFunc } from "@t007/utils";
import { initArrowNavigation, initOutsideClick, initFocusTrap, removeArrowNavigation, removeOutsideClick, removeFocusTrap, syncFocusTrap, syncArrowNavigation } from "@t007/utils/hooks/vanilla";
import { requestAnimationFrame } from "@utils/fn";
import { OrderedRegistry } from "@core/registries";
// Side-effect imports so all widgets self-register
import "./widgets/select";
import "./widgets/range";
import "./widgets/toggle";
import "./widgets/color";
import "./widgets/group";

export class SettingsMenu extends BaseComponent<SettingsMenuConfig, ComponentState, HTMLElement> {
  public static readonly componentName = "SettingsMenu";
  private registry = new OrderedRegistry<SettingsMenuItem>();
  private mainPanel!: MainMenuPanel;
  private subPanels: SubMenuPanel[] = [];
  public navStack: string[] = [];
  private menuOpen = false;
  private anchorEl?: HTMLElement;

  public override create(): HTMLElement {
    this.element = createEl("div", { className: "tmg-media-smenu-overlay", inert: true });
    this.el.addEventListener("keydown", (e: KeyboardEvent, active = getActiveEl(this.el.ownerDocument) as HTMLElement) => {
      if ((e.key === "Enter" || e.key === " ") && active && !active.matches("input,textarea,[contenteditable]") && active.tagName !== "BUTTON" && active.closest(".tmg-media-smenu-panel-active")) e.preventDefault(), active.click();
      else if (e.key === "ArrowRight" && active?.querySelector(".tmg-media-smenu-row-arrow, .tmg-media-smenu-group-arrow")) e.stopImmediatePropagation(), active.click();
      else if (e.key === "ArrowLeft" && !active?.matches("input,textarea,[contenteditable]")) e.stopImmediatePropagation(), this.goBack();
    });
    return this.element;
  }

  public override mount(onViewClick?: () => void): void {
    if (!this.element) this.create();
    this.mainPanel = new MainMenuPanel(this.ctlr, this.config);
    this.mainPanel.setup(), this.mainPanel.build();
    this.mainPanel.onItemClick = (item) => this.goTo(item.id);
    this.mainPanel.onViewClick = onViewClick;
    this.el.append(this.mainPanel.element);
    this.media.container.append(this.element);
  }

  public override wire(): void {
    // ---- Media Listeners
    this.media.on("state.paused", ({ value }) => !value && this.close(), { signal: this.signal });
    this.media.on("features", () => this.menuOpen && (this.syncMain(), this.subPanels.forEach((p) => p.syncUI())), { signal: this.signal });
    // ---- State --------
    this.ctlr.state.on("dimensions.container.width", () => this.menuOpen && this.reposition(this.anchorEl), { signal: this.signal });
    this.ctlr.state.on("dimensions.container.height", () => this.menuOpen && this.reposition(this.anchorEl), { signal: this.signal });
  }

  public override unmount(): void {
    removeOutsideClick(this.element), removeArrowNavigation(this.element), removeFocusTrap(this.element), super.unmount();
  }

  private mergeItem(item: SettingsMenuItem): SettingsMenuItem {
    const existing = this.getItem(item.id);
    if (existing) {
      if (item.items) existing.items = [...(existing.items || []), ...item.items];
      if (item.actions) existing.actions = [...(existing.actions || []), ...item.actions];
      if (item.footerActions) existing.footerActions = [...(existing.footerActions || []), ...item.footerActions];
      if (item.tipHTML && !existing.tipHTML) existing.tipHTML = item.tipHTML;
      return existing;
    }
    return item;
  }
  public register(items?: SettingsMenuItem | SettingsMenuItem[]): void {
    if (items) Array.isArray(items) ? items.forEach((item) => ((item = this.mergeItem(item)), this.registry.register(item.id, item))) : ((items = this.mergeItem(items)), this.registry.register(items.id, items)), this.menuOpen && this.syncMain();
  }
  public registerFirst(item?: SettingsMenuItem): void {
    if (item) (item = this.mergeItem(item)), this.registry.registerFirst(item.id, item), this.menuOpen && this.syncMain();
  }
  public registerBefore(key: string, item?: SettingsMenuItem): void {
    if (item) (item = this.mergeItem(item)), this.registry.registerBefore(key, item.id, item), this.menuOpen && this.syncMain();
  }
  public registerAfter(key: string, item?: SettingsMenuItem): void {
    if (item) (item = this.mergeItem(item)), this.registry.registerAfter(key, item.id, item), this.menuOpen && this.syncMain();
  }
  public unregister(id: string): void {
    this.registry.unregister(id), this.menuOpen && this.syncMain();
  }

  public getItem(id: string, items = this.registry.getAll()): SettingsMenuItem | undefined {
    for (const item of items)
      if (item.id === id) return item;
      else if (item.items) {
        const found = this.getItem(id, item.items);
        if (found) return found;
      }
    return undefined;
  }

  public syncUI(id?: string): void {
    if (id) this.subPanels[this.navStack.indexOf(id)]?.syncUI(), this.syncMain();
    else this.syncMain(), this.subPanels.forEach((p) => p.syncUI());
  }

  private lastClosedTime = 0;
  public toggle(anchorEl: HTMLElement): void {
    this.menuOpen ? this.close() : this.open(anchorEl);
  }

  public open(anchorEl: HTMLElement): void {
    if (this.menuOpen || performance.now() - this.lastClosedTime < 50) return;
    this.menuOpen = true;
    this.anchorEl = anchorEl;
    if (!this.config.preserveStack) this.navStack = [];
    if (this.navStack.length === 0) this.syncMain(), this.showPanel(this.mainPanel, "none"), this.subPanels.forEach((p) => this.hidePanel(p));
    else this.syncUI(this.navStack[this.navStack.length - 1]), this.showPanel(this.subPanels[this.navStack.length - 1], "none"), this.hidePanel(this.mainPanel), this.subPanels.forEach((p, idx) => idx !== this.navStack.length - 1 && this.hidePanel(p));
    this.reposition(anchorEl), this.el.removeAttribute("inert"), this.el.classList.add("tmg-media-smenu-overlay-open"), this.el.classList.remove("tmg-media-smenu-overlay-closed");
    this.media.container.classList.add("tmg-media-settings-menu");
    initOutsideClick(this.element, { enabled: true, onOutside: (e) => !this.anchorEl?.contains(e?.target as Node) && this.close(), outOnFocusOut: !CTX.isDevEnv }), initFocusTrap(this.element, { enabled: true });
    initArrowNavigation(this.element, { enabled: true, rovingTab: false, focusOnHover: false, grid: { x: 1 }, selector: ".tmg-media-smenu-panel :is([tabindex='0'], button:not([disabled]), input:not([type='checkbox'], [type='radio'], [disabled])):not(.tmg-media-smenu-back-btn, .tmg-media-range-container)" });
  }
  public close(): void {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.lastClosedTime = performance.now();
    this.el.setAttribute("inert", ""), this.el.classList.remove("tmg-media-smenu-overlay-open", "tmg-media-smenu-drop-down"), this.media.container.classList.remove("tmg-media-settings-menu");
    removeOutsideClick(this.element), removeArrowNavigation(this.element), removeFocusTrap(this.element);
    this.anchorEl?.focus(), (this.anchorEl = undefined);
  }
  public get isOpen(): boolean {
    return this.menuOpen;
  }

  private getSubPanel(depth: number): SubMenuPanel {
    if (!this.subPanels[depth]) {
      const p = new SubMenuPanel(this.ctlr);
      p.setup();
      p.onBack = this.goBack;
      p.onSubItemClick = (item) => this.goTo(item.id);
      this.element.append(p.element), syncFocusTrap(this.element);
      this.subPanels[depth] = p;
    }
    return this.subPanels[depth];
  }

  public goTo(id: string): void {
    const item = this.getItem(id);
    if (!item || (!item.items && !item.widget) || item.widget === "button" || item.widget === "toggle") return;
    const activePanel = this.navStack.length === 0 ? this.mainPanel : this.subPanels[this.navStack.length - 1];
    this.navStack.push(id);
    const nextPanel = this.getSubPanel(this.navStack.length - 1);
    nextPanel.load(item);
    this.showPanel(nextPanel, "forward"), this.hidePanel(activePanel, "backward");
  }
  public goBack(): void {
    if (this.navStack.length === 0) return;
    const activePanel = this.subPanels[this.navStack.length - 1];
    this.navStack.pop();
    this.showPanel(this.navStack.length === 0 ? this.mainPanel : this.subPanels[this.navStack.length - 1], "backward");
    this.hidePanel(activePanel, "forward");
  }

  private showPanel(panel: BaseMenuPanel, dir: PanelDir = "forward"): void {
    panel.enter(dir), this.syncHeight(panel), syncArrowNavigation(this.element);
  }
  private hidePanel(panel: BaseMenuPanel, dir: PanelDir = "backward"): void {
    panel.exit(dir);
  }

  private syncMain(): void {
    this.mainPanel.sync(this.registry.getAll().filter((item) => ((isFunc(item.hidden) ? item.hidden() : item.hidden) ? false : !item.feature || Boolean(this.media.features[item.feature]))));
  }
  private syncHeight(panel: BaseMenuPanel, height = panel.contentHeight): void {
    requestAnimationFrame(() => this.menuOpen && height && (this.el.style.height = `${height}px`), this.signal);
  }

  private reposition(anchorEl?: HTMLElement): void {
    const container = this.media.container,
      cRect = container.getBoundingClientRect(),
      aRect = anchorEl ? anchorEl.getBoundingClientRect() : this.el.getBoundingClientRect();
    if (!anchorEl && !this.menuOpen) return;

    const y = aRect.top - cRect.top;
    const menuWidth = this.el.offsetWidth || 320;

    // Shift logic: align right by default, but clamp rigidly to container bounds
    let xPos = aRect.right - cRect.left - menuWidth + 10;
    const margin = 12;
    if (xPos < margin) xPos = margin;
    if (xPos + menuWidth > cRect.width - margin) xPos = cRect.width - menuWidth - margin;

    this.el.style.setProperty("--tmg-smenu-anchor-x", `${xPos}px`);
    this.el.style.setProperty("--tmg-smenu-anchor-y", `${y}px`);
    this.el.classList.toggle("tmg-media-smenu-drop-down", y < cRect.height / 2);
  }
}

export type * from "../types";
