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
    this.media.on("features", () => this.menuOpen && this.syncUI(), { signal: this.signal });
    // ---- State --------
    this.ctlr.state.on("dimensions.container.width", () => this.menuOpen && this.reposition(this.anchorEl), { signal: this.signal });
    this.ctlr.state.on("dimensions.container.height", () => this.menuOpen && this.reposition(this.anchorEl), { signal: this.signal });
    this.ctlr.config.on("settings.settingsView.menu.blacklist", () => this.menuOpen && this.syncUI(), { signal: this.signal });
  }

  public override unmount(): void {
    removeOutsideClick(this.element), removeArrowNavigation(this.element), removeFocusTrap(this.element), super.unmount();
  }

  private mergeItem(item: SettingsMenuItem): SettingsMenuItem {
    const existing = this.getItem(item.id);
    if (!existing) {
      if (item.configPaths) for (const path of item.configPaths) this.ctlr.config.on(path, () => this.menuOpen && this.syncMain(), { signal: this.signal });
      if (item.mediaPaths) for (const path of item.mediaPaths) this.media.on(path, () => this.menuOpen && this.syncMain(), { signal: this.signal });
    }
    if (existing) {
      if (item.items) {
        existing.items ??= [];
        for (const subItem of item.items) {
          const exSub = existing.items.find((i) => i.id === subItem.id);
          exSub ? this.mergeItem(subItem) : existing.items.push(subItem);
        }
      }
      if (item.actions) existing.actions = [...(existing.actions || []), ...item.actions];
      if (item.footerActions) existing.footerActions = [...(existing.footerActions || []), ...item.footerActions];
      if (item.getTipHTML && !existing.getTipHTML) existing.getTipHTML = item.getTipHTML;
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
    this.menuOpen && requestAnimationFrame(() => this.syncHeight(this.navStack.length === 0 ? this.mainPanel : this.subPanels[this.navStack.length - 1]), this.signal);
  }

  private lastClosedTime = 0;
  public toggle(anchorEl?: HTMLElement, preserveStack = false): void {
    this.menuOpen ? this.close() : this.open(anchorEl, preserveStack);
  }

  public open(anchorEl = this.ctlr.plug("settings.controlPanel")?.compEl("settings") ?? this.media.container, preserveStack = false): void {
    if (!(this.anchorEl = anchorEl) || this.menuOpen || performance.now() - this.lastClosedTime < 50) return;
    this.menuOpen = true;
    if (!preserveStack) this.navStack = [];
    if (this.navStack.length === 0) this.syncMain(), this.subPanels.forEach((p) => this.hidePanel(p)), this.showPanel(this.mainPanel, "none");
    else this.syncUI(this.navStack[this.navStack.length - 1]), this.hidePanel(this.mainPanel), this.subPanels.forEach((p, idx) => idx !== this.navStack.length - 1 && this.hidePanel(p)), this.showPanel(this.subPanels[this.navStack.length - 1], "none");
    this.reposition(anchorEl), this.el.removeAttribute("inert"), this.el.classList.add("tmg-media-smenu-overlay-open"), this.el.classList.remove("tmg-media-smenu-overlay-closed");
    this.media.container.classList.add("tmg-media-settings-menu");
    initOutsideClick(this.element, { enabled: true, onOutside: (e) => !this.anchorEl?.contains(((e as FocusEvent).relatedTarget || e?.target) as Node) && this.close(), outOnFocusOut: !CTX.isDevEnv }), initFocusTrap(this.element, { enabled: true });
    initArrowNavigation(this.element, { enabled: true, rovingTab: false, grid: { x: 1 }, selector: ".tmg-media-smenu-panel-active :is([tabindex='0'], button, input:not([type='checkbox'], [type='radio'])):not(.tmg-media-smenu-back-btn, .tmg-media-range-container)" });
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
    this.hidePanel(activePanel, "backward"), this.showPanel(nextPanel, "forward");
  }
  public goBack(): void {
    if (this.navStack.length === 0) return;
    const activePanel = this.subPanels[this.navStack.length - 1];
    this.navStack.pop();
    this.hidePanel(activePanel, "forward"), this.showPanel(this.navStack.length === 0 ? this.mainPanel : this.subPanels[this.navStack.length - 1], "backward");
  }

  private showPanel(panel: BaseMenuPanel, dir: PanelDir = "forward"): void {
    panel.enter(dir), this.syncHeight(panel), syncArrowNavigation(this.element);
  }
  private hidePanel(panel: BaseMenuPanel, dir: PanelDir = "backward"): void {
    panel.exit(dir);
  }

  private syncMain(): void {
    this.mainPanel.sync(this.registry.getAll().filter((item) => !this.config.blacklist.includes(item.id) && !(isFunc(item.hidden) ? item.hidden() : item.hidden) && (!item.feature || this.media.features[item.feature] !== false)));
    this.menuOpen && requestAnimationFrame(() => this.syncHeight(this.navStack.length === 0 ? this.mainPanel : this.subPanels[this.navStack.length - 1]), this.signal);
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
    this.el.style.setProperty("--tmg-smenu-anchor-x", `${xPos}px`), this.el.style.setProperty("--tmg-smenu-anchor-y", `${y}px`);
    this.el.classList.toggle("tmg-media-smenu-drop-down", y < cRect.height / 2);
  }
}

export type * from "../types";
