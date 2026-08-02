import { BasePlug } from "../../base";
import { CONTROL_PANEL_BUILD } from "./build";
import type { ControlPanelConfig, ControlPanelBottomTuple, ControlPanelSlots, ControlPanelShells, AnyControl, PanelSlot, PanelShell } from "./types";
import { ControlPanelDraggablePin } from "./draggable";
import { ROWS_ARR } from "./build";
import type { Controller } from "@core/controller";
import type { CtlrConfig } from "@defs/config";
import type { ComponentRegistryMap } from "@defs/registries";
import { type REvent } from "sia-reactor";
import { BaseComponent } from "@components/base";
import { ComponentRegistry, PinRegistry } from "@core/registries";
import { createEl, createListRenderer, observeResize } from "@utils/dom";
import { getPanelSplitCtrls, parsePanelBottomObj } from "@utils/obj";
import { initScrollAssist, removeScrollAssist } from "@t007/utils/hooks/vanilla";
import { createReactorSync } from "sia-reactor/utils";

export class ControlPanelPlug extends BasePlug<ControlPanelConfig> {
  public static readonly plugName = "controlPanel";
  public static readonly BUILD = CONTROL_PANEL_BUILD;
  public controls = new Map<string, BaseComponent<any, any>>();
  public draggable?: ControlPanelDraggablePin;
  public zoneEls!: HTMLElement[];
  public shells!: ControlPanelShells;
  public slots!: ControlPanelSlots;
  protected slotters = new WeakMap<HTMLElement, ReturnType<typeof createListRenderer<string>>>();
  protected wratters = new WeakMap<HTMLElement, ReturnType<typeof createListRenderer<PanelSlot>>>();
  protected scrollers: HTMLElement[] = [];
  protected topWrapper!: HTMLElement;
  protected bigWrapper!: HTMLElement;
  protected bottomWrapper!: HTMLElement;

  constructor(ctlr: Controller, config = ctlr.settings.controlPanel) {
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
    for (const i of ROWS_ARR) this.shells.bottom[i] = { left: this.buildShell("left"), center: this.buildShell("center"), right: this.buildShell("right") };
    this.slots = { top: {}, center: this.shells.center, bottom: { 1: {}, 2: {}, 3: {} } } as ControlPanelSlots;
    this.zoneEls = [...Object.values(this.shells.top), ...Object.values(this.shells.bottom).map((v) => Object.values(v))].flat().map((w) => w.zone);
    // DOM Injection
    this.shells.center.cover.append(this.shells.center.zone);
    for (const i of ROWS_ARR) this.bottomWrapper.append(createEl("div", { className: `tmg-media-bottom-sub-controls-wrapper tmg-media-bottom-${i}-sub-controls-wrapper tmg-media-apt-controls-wrapper` }, { dropZone: "", dragId: "wrapper" }));
    this.ctlr.DOM.controlsContainer?.append(this.topWrapper, this.shells.center.cover, this.bottomWrapper);
    // DOM! -> Ctlr Config Setters
    this.ctlr.config.set("settings.controlPanel.bottom", (v) => parsePanelBottomObj(v), { init: true, signal: this.signal });
    // DOM! -> Ctlr Config Listeners
    this.ctlr.config.on("settings.controlPanel.top", this.handleTop, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.center", this.handleCenter, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.bottom", this.handleBottom, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.buffer.value", this.handleBuffer, { init: true, signal: this.signal });
    // Utility Injection
    this.draggable?.mount?.();
  }
  public override unmount(): void {
    for (const w of [this.topWrapper, this.bigWrapper.parentElement, this.bottomWrapper]) w?.remove();
  }

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.controlPanel.timeline.thumb.value", ({ value }) => (this.media.container.dataset.timelineThumb = String(value)), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.progressBar", ({ value }) => this.media.container.classList.toggle("tmg-media-progress-bar", value), { init: true, signal: this.signal });
    // Utility Injection
    this.draggable?.wire();
    // Post Wiring
    this.initScrollAndResize(), super.wire();
  }

  protected handleTop({ currentTarget: { value } }: REvent<CtlrConfig, "settings.controlPanel.top">): void {
    const { left, center, right } = getPanelSplitCtrls((value ||= []) as AnyControl[]);
    this.fillWrapper(this.topWrapper, [(this.slots.top.left = this.getSlot(left, this.shells.top.left)), (this.slots.top.center = this.getSlot(center, this.shells.top.center)), (this.slots.top.right = this.getSlot(right, this.shells.top.right))]);
    this.fillSlot(this.slots.top.left, left), this.fillSlot(this.slots.top.center, center), this.fillSlot(this.slots.top.right, right), this.ctlr.payload.wired && this.config.draggable && this.draggable?.setEventListeners("add");
  }

  protected handleCenter({ currentTarget: { value } }: REvent<CtlrConfig, "settings.controlPanel.center">): void {
    this.fillSlot(this.slots.center, (value ||= [])), this.ctlr.payload.wired && this.config.draggable && this.draggable?.setEventListeners("add");
  }

  protected handleBottom({ currentTarget: { value } }: REvent<CtlrConfig, "settings.controlPanel.bottom">): void {
    for (const i of ROWS_ARR) {
      const { left, center, right } = getPanelSplitCtrls(((value ||= {}) as ControlPanelBottomTuple)[i]);
      this.fillWrapper(this.bottomWrapper.children[i - 1] as HTMLElement, [(this.slots.bottom[i].left = this.getSlot(left, this.shells.bottom[i].left)), (this.slots.bottom[i].center = this.getSlot(center, this.shells.bottom[i].center)), (this.slots.bottom[i].right = this.getSlot(right, this.shells.bottom[i].right))]);
      this.fillSlot(this.slots.bottom[i].left, left), this.fillSlot(this.slots.bottom[i].center, center), this.fillSlot(this.slots.bottom[i].right, right);
    }
    this.ctlr.payload.wired && this.config.draggable && this.draggable?.setEventListeners("add");
  }

  protected handleBuffer({ value }: REvent<CtlrConfig, "settings.controlPanel.buffer.value">): void {
    if (value && !this.controls.has("buffer")) this.initComp("buffer");
    this.media.container.dataset.buffer = String(value);
  }

  public initComp<K extends keyof ComponentRegistryMap>(name: K, comp?: InstanceType<ComponentRegistryMap[K]>): InstanceType<ComponentRegistryMap[K]> | undefined;
  public initComp<T extends BaseComponent = BaseComponent>(name: string, comp?: T): T | undefined;
  public initComp(name: string, comp = ComponentRegistry.init(name, this.ctlr, (this.config as any)[name])) {
    return comp ? (name === "timeline" && createReactorSync(comp.config, this.ctlr.config, "", "settings.controlPanel.timeline", this.signal), this.controls.set(name, comp), comp) : undefined;
  }

  public comp<K extends keyof ComponentRegistryMap>(name: K): InstanceType<ComponentRegistryMap[K]> | undefined;
  public comp<T extends BaseComponent = BaseComponent>(name: string): T | undefined;
  public comp(name: string): BaseComponent | undefined {
    return this.controls.get(name);
  }
  public compEl<K extends keyof ComponentRegistryMap>(name: K): InstanceType<ComponentRegistryMap[K]>["element"] | undefined;
  public compEl<T extends BaseComponent = BaseComponent>(name: string): T["element"] | undefined;
  public compEl(name: string): HTMLElement | undefined {
    return this.controls.get(name)?.element;
  }

  public getSlot(comps: AnyControl[], fallback: PanelShell): PanelSlot {
    return comps.length === 1 ? (comps.includes("meta") ? (this.comp("meta") ?? this.initComp("meta"))?.element ?? fallback : comps.includes("timeline") ? (this.comp("timeline") ?? this.initComp("timeline"))?.element ?? fallback : fallback) : fallback;
  }

  public fillSlot(slot: PanelSlot, comps: AnyControl[]): void {
    if (slot instanceof HTMLElement || !slot.zone) return;
    let render = this.slotters.get(slot.zone); // slot.zone.innerHTML = ""; for (const id of comps) slot.zone.append((this.comp(id) ?? this.initComp(id))?.element ?? "");
    !render && this.slotters.set(slot.zone, (render = createListRenderer({ container: slot.zone, getKey: (id) => id, createNode: (id) => (this.comp(id) ?? this.initComp(id))?.element })));
    render(comps), this.handleCompsView(slot.zone);
  }

  public fillWrapper(wrapper: HTMLElement, slots: PanelSlot[]): void {
    let render = this.wratters.get(wrapper); // wrapper.innerHTML = ""; wrapper.append(...slots.map((slot) => (slot instanceof HTMLElement ? slot : slot.cover ?? slot.zone)));
    !render && this.wratters.set(wrapper, (render = createListRenderer({ container: wrapper, getKey: (slot) => ("cover" in slot ? slot.cover.dataset.shellId! : slot.dataset.controlId!), createNode: (slot) => (slot instanceof HTMLElement ? slot : slot.cover ?? slot.zone) })));
    render(slots, false);
  }

  public buildShell(side: string): PanelShell {
    const zone = createEl("div", { className: `tmg-media-side-controls-wrapper tmg-media-${side}-side-controls-wrapper` }, { dropZone: "", shellId: side, scroller: side === "right" ? "reverse" : "" }),
      cover = createEl("div", { className: `tmg-media-side-controls-wrapper-cover tmg-media-${side}-side-controls-wrapper-cover` }, { shellId: side });
    return cover.append(zone), { cover, zone };
  }

  protected initScrollAndResize(): void {
    for (const el of [...this.zoneEls, this.shells.center.zone]) {
      this.handleCompsView(el);
      this.scrollers.push((initScrollAssist(el, { pxPerSecond: el.dataset.dragId === "big" ? 120 : 60 }), el));
      observeResize(el, () => this.handleCompsView(el), this.signal);
      el.addEventListener("scroll", this.handleDirtyScroll, { passive: true, signal: this.signal });
    }
  }
  public handleDirtyScroll(e: globalThis.Event): void {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollLeft > 0) el.dataset.hasScrolled = "true";
    el.dataset.resetScrolled = String(el.scrollLeft === (el.dataset.scroller === "reverse" ? el.scrollWidth - el.clientWidth : 0));
  }

  public handleCompsView(w: HTMLElement): void {
    if (!w.isConnected) return;
    let spacer: HTMLElement | undefined,
      c: HTMLElement | null = w.firstElementChild as HTMLElement | null;
    do {
      c?.setAttribute("data-displayed", getComputedStyle(c).display !== "none" ? "true" : "false");
      c?.setAttribute("data-spacer", "false");
      if (c?.dataset.displayed === "true" && !spacer) spacer = c;
    } while ((c = (c?.nextElementSibling ?? null) as HTMLElement | null));
    this.settings.css.currentTopWrapperHeight = `${this.topWrapper.offsetHeight}px`;
    this.settings.css.currentBottomWrapperHeight = `${this.bottomWrapper.offsetHeight}px`;
    if (w.dataset.scroller !== "reverse") return;
    spacer?.setAttribute("data-spacer", "true");
    if (w.dataset.resetScrolled === "true") w.dataset.hasScrolled = "false";
    if (w.dataset.hasScrolled === "true" || w.scrollWidth <= w.clientWidth || w.scrollLeft === w.scrollWidth - w.clientWidth) return void (w.scrollWidth <= w.clientWidth && (w.dataset.hasScrolled = "false"));
    w.addEventListener("scroll", () => (w.dataset.hasScrolled = "false"), { once: true, signal: this.signal });
    w.scrollLeft = w.scrollWidth - w.clientWidth;
  }

  protected override onDestroy(): void {
    for (const scroller of this.scrollers) removeScrollAssist(scroller);
    this.draggable?.destroy();
    for (const control of this.controls.values()) control.destroy();
    super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";
export * from "./draggable";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.controlPanel": typeof ControlPanelPlug;
  }
  interface ControllerDOMMap {
    topControlsWrapper?: HTMLDivElement;
    bigControlsWrapper?: HTMLDivElement;
    bottomControlsWrapper?: HTMLDivElement;
  }
}

declare module "@defs/config" {
  interface Settings {
    controlPanel: ControlPanelConfig;
  }
}
