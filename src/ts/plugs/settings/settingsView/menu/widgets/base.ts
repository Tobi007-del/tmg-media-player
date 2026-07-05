import type { SettingsMenuItem } from "../../types";
import { Controllable } from "@core/controllable";
import { BaseRegistry } from "@core/registries";
import type { Controller } from "@core/controller";

export abstract class BaseWidget<T = unknown> extends Controllable {
  protected item: SettingsMenuItem<T>;
  public element!: HTMLElement;

  constructor(item: SettingsMenuItem<T>, ctlr: Controller) {
    super(ctlr, undefined);
    this.item = item;
  }

  public abstract render(): HTMLElement;
  public abstract syncUI(): void;
  protected override onSetup(): void {
    this.item.mediaPaths?.forEach((path) => this.media.on(path, this.syncUI, { signal: this.signal }));
    this.item.configPaths?.forEach((path) => this.ctlr.config.on(path, this.syncUI, { signal: this.signal }));
    this.item.onWire?.(this.syncUI, this.signal);
  }
  protected override onDestroy(): void {}
}

export type WidgetConstructor = new (item: SettingsMenuItem<any>, ctlr: Controller) => BaseWidget<any>;

export class WidgetRegistry extends BaseRegistry<WidgetConstructor> {
  private static instance = new WidgetRegistry();

  public static register(type: string, Ctor: WidgetConstructor): void {
    this.instance.register(type, Ctor);
  }
  public static create(item: SettingsMenuItem, ctlr: Controller): BaseWidget | null {
    const Ctor = this.instance.get(item.widget);
    if (!Ctor) return null;
    const widget = new Ctor(item, ctlr);
    return widget.setup(), widget;
  }
}
