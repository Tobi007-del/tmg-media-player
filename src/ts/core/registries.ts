import type { BaseTech, TechConstructor } from "@techs/base";
import type { BasePin, BasePlug, PinConstructor, PlugConstructor } from "@plugs/base";
import type { BaseComponent, ComponentConstructor } from "@components/base";
import { CONFIG_BUILD as CB } from "@consts/config";
import type { ComponentRegistryMap, IconRegistryMap, PinRegistryMap, PlugRegistryMap, TechRegistryMap } from "@defs/registries";
import { deletePath, setPath } from "sia-reactor/utils";
import { Controller } from "./controller";

export interface RegistryItem<T> {
  name: string;
  value: T;
  config?: any; // no closed doors
}

export class BaseRegistry<T> {
  protected items: RegistryItem<T>[] = [];

  public register(name: string, value: T, config?: any): this {
    return this.unregister(name), this.items.push({ name, value, config }), this;
  }
  public unregister(name: string, idx = this.items.findIndex((i) => i.name === name)): this {
    return idx !== -1 && this.items.splice(idx, 1), this;
  }
  public get(name: string): T | undefined {
    return this.items.find((i) => i.name === name)?.value;
  }
  public getAll(order?: string[]): T[] {
    if (!order) return this.items.map((i) => i.value);
    return this.items.sort((a, b, ai = order.indexOf(a.name), bi = order.indexOf(b.name)) => (ai === -1 && bi === -1 ? 0 : ai === -1 ? 1 : bi === -1 ? -1 : ai - bi)).map((i) => i.value);
  }
}

export class OrderedRegistry<T> extends BaseRegistry<T> {
  public registerFirst(name: string, value: T, config?: any) {
    return this.unregister(name), this.items.unshift({ name, value, config }), this;
  }
  public registerBefore(key: string, name: string, value: T, config?: any) {
    const idx = this.items.findIndex((i) => i.name === key);
    return idx !== -1 && (this.unregister(name, idx), this.items.splice(idx, 0, { name, value, config })), this;
  }
  public registerAfter(key: string, name: string, value: T, config?: any) {
    const idx = this.items.findIndex((i) => i.name === key);
    return idx !== -1 && (this.unregister(name, idx), this.items.splice(idx + 1, 0, { name, value, config })), this;
  }
}

export class TechRegistry extends OrderedRegistry<TechConstructor> {
  private static instance = new TechRegistry();

  public static get<K extends keyof TechRegistryMap>(name: K): TechRegistryMap[K] | undefined;
  public static get<T extends BaseTech = BaseTech>(name: string): TechConstructor<T> | undefined;
  public static get(name: string): any {
    return this.instance.get(name);
  }
  public static register(Tech: TechConstructor): void {
    this.instance.register(Tech.techName, Tech);
  }
  public static unregister(name: string): void {
    this.instance.unregister(name);
  }
  public static registerBefore(key: string, Tech: TechConstructor): void {
    this.instance.registerBefore(key, Tech.techName, Tech);
  }
  public static registerAfter(key: string, Tech: TechConstructor): void {
    this.instance.registerAfter(key, Tech.techName, Tech);
  }
  public static pick(src: string, techOrder?: string[]): TechConstructor | null {
    return this.instance.getAll(techOrder).find((T) => T.canPlaySource(src)) || null;
  }
}

export class PlugRegistry extends OrderedRegistry<PlugConstructor> {
  private static instance = new PlugRegistry();

  public static get<K extends keyof PlugRegistryMap>(name: K): PlugRegistryMap[K] | undefined;
  public static get<T extends BasePlug = BasePlug>(name: string): PlugConstructor<T> | undefined;
  public static get(name: string): any {
    return this.instance.get(name);
  }
  public static register(Plug: PlugConstructor): void {
    this.instance.register(Plug.fullName, Plug);
    setPath(CB as any, Plug.fullName, Plug.BUILD);
  }
  public static unregister(fullName: string): void {
    this.instance.unregister(fullName);
    deletePath(CB as any, fullName);
  }
  public static registerBefore(key: string, Plug: PlugConstructor): void {
    this.instance.registerBefore(key, Plug.fullName, Plug);
  }
  public static registerAfter(key: string, Plug: PlugConstructor): void {
    this.instance.registerAfter(key, Plug.fullName, Plug);
  }
  public static getOrdered(): PlugConstructor[] {
    return this.instance.getAll();
  }
}

export class PinRegistry extends BaseRegistry<PinConstructor> {
  private static instance = new PinRegistry();

  public static get<K extends keyof PinRegistryMap>(name: K): PinRegistryMap[K] | undefined;
  public static get<T extends BasePin = BasePin>(name: string): PinConstructor<T> | undefined;
  public static get(name: string): any {
    return this.instance.get(name);
  }
  public static register(Pin: PinConstructor): void {
    this.instance.register(Pin.fullName, Pin);
    setPath(CB as any, Pin.Plug.fullName + "." + Pin.pinName, Pin.BUILD);
  }
  public static unregister(fullName: string): void {
    this.instance.unregister(fullName);
    deletePath((fullName.slice(0, fullName.indexOf(".")) in CB ? CB : CB.settings) as any, fullName);
  }
}

export class ComponentRegistry extends BaseRegistry<ComponentConstructor> {
  private static instance = new ComponentRegistry();

  public static get<K extends keyof ComponentRegistryMap>(name: K): ComponentRegistryMap[K] | undefined;
  public static get<T extends BaseComponent = BaseComponent>(name: string): ComponentConstructor<T> | undefined;
  public static get(name: string): any {
    return this.instance.get(name);
  }
  public static register(Comp: ComponentConstructor): void {
    this.instance.register(Comp.componentName, Comp);
  }
  public static init<K extends keyof ComponentRegistryMap>(name: K, ctlr: Controller, config?: any): InstanceType<ComponentRegistryMap[K]> | null;
  public static init<T extends BaseComponent = BaseComponent>(name: string, ctlr: any, config?: any): T | null;
  public static init(name: string, ctlr: any, config = {}): any {
    const Comp = this.instance.get(name);
    if (!Comp) return null;
    const instance = new Comp(ctlr, config);
    return instance.create(), instance.setup();
  }
  public static getAll(): ComponentConstructor[] {
    return this.instance.getAll();
  }
}

export class IconRegistry extends BaseRegistry<string> {
  private static instance = new IconRegistry();

  public static get<K extends keyof IconRegistryMap>(name: K, raw?: boolean, token?: RegExp | string): IconRegistryMap[K] | string;
  public static get(name: string, raw = false, token = /\btmg-media-[^\s"']+\s*/g) {
    return (raw ? this.instance.get(name)?.replace(token, "") : this.instance.get(name)) || `<svg></svg>`;
  }
  public static register(name: string, svg: string): void {
    this.instance.register(name, svg);
  }
  // Bulk register a map of icons { play: "<svg...>", pause: "<svg...>" }
  public static registerAll(icons: Record<string, string>): void {
    Object.keys(icons).forEach((k) => this.instance.register(k, icons[k]));
  }
}
