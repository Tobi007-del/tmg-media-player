import { BasePlug } from "../../base";
import { CONTROL_PANEL_BUILD } from "./build";
import type { ControlPanel, ControlPanelBottomTuple, ControlPanelSlots, ControlPanelShells, AnyControl, PanelSlot, PanelShell } from "./types";
import { ControlPanelDraggablePin } from "./draggable";
import { ROWS_ARR } from "./build";
import type { Controller } from "@core/controller";
import type { CtlrConfig } from "@defs/config";
import type { ComponentRegistryMap } from "@defs/registries";
import { type REvent } from "sia-reactor";
import { BaseComponent } from "@components/base";
import { ComponentRegistry, PinRegistry } from "@core/registries";
import { createEl, observeResize } from "@utils/dom";
import { isBool, parsePanelBottomObj } from "@utils/obj";
import { initScrollAssist, removeScrollAssist } from "@t007/utils/hooks/vanilla";
import { fanout } from "sia-reactor/utils";

export class ControlPanelPlug extends BasePlug<ControlPanel> {
  public static readonly plugName = "controlPanel";
  public static readonly BUILD = CONTROL_PANEL_BUILD;
  public controls = new Map<string, BaseComponent<any, any>>();
  public draggable?: ControlPanelDraggablePin;
  public shells!: ControlPanelShells;
  public slots!: ControlPanelSlots;
  public zoneEls!: HTMLElement[];
  protected scrollers: HTMLElement[] = [];
  protected topWrapper!: HTMLElement;
  protected bigWrapper!: HTMLElement;
  protected bottomWrapper!: HTMLElement;

  constructor(ctlr: Controller, config: ControlPanel = ctlr.config.settings.controlPanel) {
    super(ctlr, config);
    const Pin = PinRegistry.get("controlPanel.draggable");
    if (Pin) this.draggable = new Pin(this.ctlr, this.config.draggable);
  }

  public override mount(): void {
    // Variables Assignment
    this.ctlr.DOM.topControlsWrapper = this.topWrapper = createEl("div", { className: "tmg-media-top-controls-wrapper tmg-media-apt-controls-wrapper" }, { dropZone: "", dragId: "wrapper" });
    this.ctlr.DOM.bigControlsWrapper = this.bigWrapper = createEl("div", { className: "tmg-media-big-controls-wrapper" }, { dropZone: "", dragId: "big" });
    this.ctlr.DOM.bottomControlsWrapper = this.bottomWrapper = createEl("div", { className: "tmg-media-bottom-controls-wrapper" });
    this.shells = { top: {}, center: {}, bottom: { 1: {}, 2: {}, 3: {} } } as ControlPanelShells;
    this.shells.top = { left: this.buildShell("left"), center: this.buildShell("center"), right: this.buildShell("right") };
    this.shells.center = { zone: this.bigWrapper, cover: createEl("div", { className: "tmg-media-big-controls-wrapper-cover" }) };
    ROWS_ARR.forEach((i) => (this.shells.bottom[i] = { left: this.buildShell("left"), center: this.buildShell("center"), right: this.buildShell("right") }));
    this.slots = { top: {}, center: this.shells.center, bottom: { 1: {}, 2: {}, 3: {} } } as ControlPanelSlots;
    this.zoneEls = [...Object.values(this.shells.top), ...Object.values(this.shells.bottom).map((v) => Object.values(v))].flat().map((w) => w.zone);
    // DOM Injection
    this.shells.center.cover.append(this.shells.center.zone);
    this.topWrapper.append(this.shells.top.left.cover, this.shells.top.center.cover, this.shells.top.right.cover);
    ROWS_ARR.forEach((i) => {
      const row = createEl("div", { className: `tmg-media-bottom-sub-controls-wrapper tmg-media-bottom-${i}-sub-controls-wrapper tmg-media-apt-controls-wrapper` }, { dropZone: "", dragId: "wrapper" });
      this.bottomWrapper.append((row.append(this.shells.bottom[i].left.cover, this.shells.bottom[i].center.cover, this.shells.bottom[i].right.cover), row));
    });
    this.ctlr.DOM.controlsContainer?.append(this.topWrapper, this.shells.center.cover, this.bottomWrapper);
    // DOM! -> Ctlr Config Setters
    this.ctlr.config.set("settings.controlPanel.bottom", (v) => parsePanelBottomObj(v), { init: true });
    // DOM! -> Ctlr Config Listeners
    this.ctlr.config.on("settings.controlPanel.top", this.handleTop, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.center", this.handleCenter, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.bottom", this.handleBottom, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.buffer", this.handleBuffer, { init: true, signal: this.signal });
    // Utility Injection
    this.draggable?.mount?.();
  }
  public override unmount(): void {
    [this.topWrapper, this.bigWrapper.parentElement, this.bottomWrapper].forEach((w) => w?.remove());
  }

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.controlPanel.timeline.thumbIndicator", ({ value }) => (this.media.container.dataset.thumbIndicator = String(value)), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.timeline.seek", this.handleTimelineSeek, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.timeline.previews", this.handleTimelinePreview, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.progressBar", ({ value }) => this.media.container.classList.toggle("tmg-media-progress-bar", value), { init: true, signal: this.signal });
    // Utility Injection
    this.draggable?.wire();
    // Post Wiring
    this.initScrollAndResize();
  }

  protected handleTop({ value }: REvent<CtlrConfig, "settings.controlPanel.top">): void {
    if (!value || isBool(value)) return;
    const { left, center, right } = this.getSplitCtrls(value);
    this.fillWrapper(this.topWrapper, [(this.slots.top.left = this.getSlot(left, this.shells.top.left)), (this.slots.top.center = this.getSlot(center, this.shells.top.center)), (this.slots.top.right = this.getSlot(right, this.shells.top.right))]);
    this.fillSlot(this.slots.top.left, left), this.fillSlot(this.slots.top.center, center), this.fillSlot(this.slots.top.right, right);
  }

  protected handleCenter({ value }: REvent<CtlrConfig, "settings.controlPanel.center">): void {
    if (!value || isBool(value)) return;
    this.fillSlot(this.slots.center, value);
  }

  protected handleBottom({ value }: REvent<CtlrConfig, "settings.controlPanel.bottom">): void {
    if (!value || isBool(value)) return;
    ROWS_ARR.forEach((i) => {
      const { left, center, right } = this.getSplitCtrls((value as ControlPanelBottomTuple)[i]);
      this.fillWrapper(this.bottomWrapper.children[i - 1] as HTMLElement, [(this.slots.bottom[i].left = this.getSlot(left, this.shells.bottom[i].left)), (this.slots.bottom[i].center = this.getSlot(center, this.shells.bottom[i].center)), (this.slots.bottom[i].right = this.getSlot(right, this.shells.bottom[i].right))]);
      this.fillSlot(this.slots.bottom[i].left, left), this.fillSlot(this.slots.bottom[i].center, center), this.fillSlot(this.slots.bottom[i].right, right);
    });
  }

  protected handleBuffer({ value }: REvent<CtlrConfig, "settings.controlPanel.buffer">): void {
    if (value && !this.controls.has("buffer")) this.initCtrl("buffer");
    this.media.container.dataset.buffer = String(value);
  }

  protected handleTimelineSeek({ currentTarget: { value } }: REvent<CtlrConfig, "settings.controlPanel.timeline.seek">, timeline = this.ctrl("timeline")): void {
    if (timeline) fanout(timeline.config.scrub, value);
  }
  protected handleTimelinePreview({ currentTarget: { value } }: REvent<CtlrConfig, "settings.controlPanel.timeline.previews">, timeline = this.ctrl("timeline")): void {
    if (timeline) timeline.config.previews = value;
  }

  public initCtrl<K extends keyof ComponentRegistryMap>(name: K, ctrl?: InstanceType<ComponentRegistryMap[K]>): InstanceType<ComponentRegistryMap[K]> | undefined;
  public initCtrl<T extends BaseComponent = BaseComponent>(name: string, ctrl?: T): T | undefined;
  public initCtrl(name: string, ctrl = ComponentRegistry.init(name, this.ctlr)) {
    return ctrl ? (this.controls.set(name, ctrl), ctrl) : undefined;
  }

  public ctrl<K extends keyof ComponentRegistryMap>(name: K): InstanceType<ComponentRegistryMap[K]> | undefined;
  public ctrl<T extends BaseComponent = BaseComponent>(name: string): T | undefined;
  public ctrl(name: string): BaseComponent | undefined {
    return this.controls.get(name);
  }
  public ctrlEl<K extends keyof ComponentRegistryMap>(name: K): InstanceType<ComponentRegistryMap[K]>["element"] | undefined;
  public ctrlEl<T extends BaseComponent = BaseComponent>(name: string): T["element"] | undefined;
  public ctrlEl(name: string): HTMLElement | undefined {
    return this.controls.get(name)?.element;
  }

  protected getSlot(ctrls: AnyControl[], fallback: PanelShell): PanelSlot {
    return ctrls.length === 1 ? (ctrls.includes("meta") ? (this.ctrl("meta") ?? this.initCtrl("meta"))?.element ?? fallback : ctrls.includes("timeline") ? (this.ctrl("timeline") ?? this.initCtrl("timeline"))?.element ?? fallback : fallback) : fallback;
  }

  protected fillSlot(slot: PanelSlot, ctrls: AnyControl[]): void {
    if (slot instanceof HTMLElement || !slot.zone) return;
    slot.zone.innerHTML = "";
    for (const id of ctrls) slot.zone.append((this.ctrl(id) ?? this.initCtrl(id))?.element ?? "");
    this.handleCtrlsView(slot.zone);
  }

  protected fillWrapper(wrapper: HTMLElement, slots: PanelSlot[]): void {
    wrapper.innerHTML = "";
    wrapper.append(...slots.map((slot) => (slot instanceof HTMLElement ? slot : slot.cover ?? slot.zone)));
  }

  protected buildShell(side: string): PanelShell {
    const zone = createEl("div", { className: `tmg-media-side-controls-wrapper tmg-media-${side}-side-controls-wrapper` }, { dropZone: "", scroller: side === "right" ? "reverse" : "" }),
      cover = createEl("div", { className: `tmg-media-side-controls-wrapper-cover tmg-media-${side}-side-controls-wrapper-cover` });
    return cover.append(zone), { cover, zone };
  }

  protected initScrollAndResize(): void {
    [...this.zoneEls, this.shells.center.zone].forEach((el) => {
      this.handleCtrlsView(el);
      this.scrollers.push((initScrollAssist(el, { pxPerSecond: el.dataset.dragId === "big" ? 120 : 60 }), el));
      observeResize(el, () => this.handleCtrlsView(el), this.signal);
      el.addEventListener("scroll", this.handleDirtyScroll, { passive: true, signal: this.signal });
    });
  }
  protected handleDirtyScroll(e: globalThis.Event): void {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollLeft > 0) el.dataset.hasScrolled = "true";
    el.dataset.resetScrolled = String(el.scrollLeft === (el.dataset.scroller === "reverse" ? el.scrollWidth - el.clientWidth : 0));
  }

  public handleCtrlsView(w: HTMLElement): void {
    if (!w.isConnected) return;
    let spacer: HTMLElement | undefined,
      c: HTMLElement | null = w.firstElementChild as HTMLElement | null;
    do {
      c?.setAttribute("data-displayed", getComputedStyle(c).display !== "none" ? "true" : "false");
      c?.setAttribute("data-spacer", "false");
      if (c?.dataset.displayed === "true" && !spacer) spacer = c;
    } while ((c = (c?.nextElementSibling ?? null) as HTMLElement | null));
    this.ctlr.settings.css.currentTopWrapperHeight = `${this.topWrapper.offsetHeight}px`;
    this.ctlr.settings.css.currentBottomWrapperHeight = `${this.bottomWrapper.offsetHeight}px`;
    if (w.dataset.scroller !== "reverse") return;
    spacer?.setAttribute("data-spacer", "true");
    if (w.dataset.resetScrolled === "true") w.dataset.hasScrolled = "false";
    if (w.dataset.hasScrolled === "true" || w.scrollWidth <= w.clientWidth || w.scrollLeft === w.scrollWidth - w.clientWidth) return void (w.scrollWidth <= w.clientWidth && (w.dataset.hasScrolled = "false"));
    w.addEventListener("scroll", () => (w.dataset.hasScrolled = "false"), { once: true, signal: this.signal });
    w.scrollLeft = w.scrollWidth - w.clientWidth;
  }

  protected getSplitCtrls(row: AnyControl[]): { left: AnyControl[]; center: AnyControl[]; right: AnyControl[] } {
    if (!row?.length) return { left: [], center: [], right: [] };
    const s1 = row.indexOf("spacer"),
      s2 = row.indexOf("spacer", s1 + 1);
    return s1 === -1 ? { left: row, center: [], right: [] } : s2 === -1 ? { left: row.slice(0, s1), center: [], right: row.slice(s1 + 1) } : { left: row.slice(0, s1), center: row.slice(s1 + 1, s2), right: row.slice(s2 + 1) };
  }

  protected override onDestroy(): void {
    this.scrollers.forEach(removeScrollAssist);
    this.draggable?.destroy(), this.controls.forEach((c) => c.destroy()), this.controls.clear();
    super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface ControllerDOMMap {
    topControlsWrapper?: HTMLDivElement;
    bigControlsWrapper?: HTMLDivElement;
    bottomControlsWrapper?: HTMLDivElement;
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.controlPanel": typeof ControlPanelPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    controlPanel: ControlPanel;
  }
}
export * from "./draggable";
