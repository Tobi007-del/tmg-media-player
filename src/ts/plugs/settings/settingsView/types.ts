import type { UIOption } from "@defs/UIOptions";
import type { MediaFeatures } from "@defs/contract";
import type { BaseWidget } from "./menu/widgets";
import type { Paths } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import type { IconRegistryMap } from "@defs/registries";
import type { FieldOptions } from "@t007/input";

export interface SettingsMenuConfig {
  disabled: boolean;
  showView: boolean;
  blacklist: string[];
}

export interface SettingsViewConfig {
  autoPause: boolean;
  menu: SettingsMenuConfig;
}

export interface SettingsViewState {
  viewOpen: boolean;
}

export type MenuItemWidget = "select" | "range" | "toggle" | "color" | "group" | "button" | "playlist" | "input" | "drag-select" | "limits";

export interface SettingsRowElement extends HTMLElement {
  widget?: BaseWidget;
}

export interface SettingsMenuRangeConfig {
  min: number;
  max: number;
  step?: number;
  /** Explicit manual divisions to draw, overriding options */
  divs?: number[];
  /** Optional discrete snap-point options displayed as markers */
  options?: UIOption<number>[];
  /** Optional custom tooltip formatter */
  formatTooltip?: (val: number) => string;
}

export type SettingsMenuItem<T = unknown> = DOmit<Partial<FieldOptions>, "title" | "hidden"> & {
  id: string;
  label: string;
  icon?: keyof IconRegistryMap;
  infoText?: string | (() => string);
  title?: string | (() => string);
  getBadge?: () => { label?: string; value?: string } | string | undefined;
  widget: MenuItemWidget;
  /** Hide the row based on custom logic */
  hidden?: boolean | (() => boolean);
  /** Hide the row if this feature flag is falsy */
  feature?: keyof MediaFeatures;
  /** Whether the widget should be rendered directly inside the parent group (inline) rather than opening a sub-panel */
  inline?: boolean;
  /** Return the current human-readable value badge shown on the row (or array of active values/displays for multi) */
  getValue(): string | string[] | undefined | null;
  /** Called when the user commits a new value */
  onChange?(value: T | Record<string, string | number | undefined>): void;
  inputs?: (DOmit<Partial<FieldOptions>, "value" | "min" | "max"> & { name?: string; value?: string | number | undefined | (() => string | number | undefined); min?: string | number | (() => string | number); max?: string | number | (() => string | number) })[];
  /** Whether this widget (e.g. select) supports selecting multiple options */
  getMultiple?(): boolean;
  /** For "limits" */
  getLimits?(): { name: string; label: string; min?: number; max?: number; step?: number; start?: number; end?: number }[];
  /** Called when a drag-select option is deleted */
  onDelete?(idx: number): void;
  /** Called when a drag-select option is edited */
  onEdit?(idx: number): void;
  /** For "select" and "color", list of options */
  getOptions?(): UIOption<T>[];
  /** For "range" */
  getRange?(): SettingsMenuRangeConfig;
  /** For "group", nested items rendered in a deeper sub-panel */
  items?: SettingsMenuItem[];
  /** Whether the row is disabled (greyed out, non-interactive) */
  getDisabled?(): boolean;
  /** Reactor paths on media to observe so the value badge re-renders */
  mediaPaths?: Paths<CtlrMedia>[];
  /** Reactor paths on config to observe so the value badge re-renders */
  configPaths?: Paths<CtlrConfig>[];
  /** Custom lifecycle hook called when the row is rendered. Used to attach custom event listeners to trigger `syncUI`. */
  onWire?: (syncUI: () => void, signal: AbortSignal) => void;
  /** For "group" or general widgets, optional header actions (buttons) */
  actions?: { id?: string; getLabel: () => string; icon?: keyof IconRegistryMap; onClick: () => void; getDisabled?: () => boolean; hidden?: () => boolean }[];
  /** Optional form-like actions rendered at the bottom of a sub-panel */
  footerActions?: { id?: string; getLabel: () => string; icon?: keyof IconRegistryMap; onClick: () => void; getDisabled?: () => boolean; hidden?: () => boolean }[];
  /** For general widgets, optional helper text/HTML to show below the widget */
  getTipHTML?: () => string;
  /** For "drag-select", called when a drag/drop reorder occurs */
  onReorder?: (oldIdx: number, newIdx: number) => void;
};

// The magic utility that doesn't kill your union types
type DOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
