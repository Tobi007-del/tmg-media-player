import type { TimelineConfig } from "@components/controls/timeline/types";
import { CONTROLS, BIG_CONTROLS, ROWS_ARR } from "./build";
import { UISettings } from "@defs/UIOptions";

export interface ControlPanelConfig {
  profile: string | boolean;
  title: string | boolean;
  artist: string | boolean;
  top: AnyControl[] | boolean;
  center: AnyControl[] | boolean;
  bottom: boolean | AnyControl[] | AnyControl[][] | Partial<ControlPanelBottomTuple>;
  buffer: UISettings<"eclipse" | "accent" | boolean>;
  timeline: TimelineConfig & { thumb: UISettings<boolean | "auto"> };
  progressBar: boolean;
  draggable: ControlPanelDraggable;
}

export type Control = (typeof CONTROLS)[number];
export type BigControl = (typeof BIG_CONTROLS)[number];
export type AnyControl = BigControl | Control | "spacer";
export type ControlPanelBottomTuple = Record<Row, AnyControl[]>;
export type ControlPanelDraggable = ("" | "big" | "wrapper")[] | boolean;

export type Row = (typeof ROWS_ARR)[number];

export interface PanelShell {
  cover: HTMLElement;
  zone: HTMLElement;
}
export type PanelSlot = PanelShell | HTMLElement;

export interface ControlPanelShells {
  top: Record<"left" | "center" | "right", PanelShell>;
  center: PanelShell;
  bottom: Record<Row, Record<"left" | "center" | "right", PanelShell>>;
}
export interface ControlPanelSlots {
  top: Record<"left" | "center" | "right", PanelSlot>;
  center: PanelSlot;
  bottom: Record<Row, Record<"left" | "center" | "right", PanelSlot>>;
}
