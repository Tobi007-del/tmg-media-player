import type { TimelineConfig } from "@components/controls/timeline/types";
import { CONTROLS, ROWS_ARR } from "./build";
import { UISettings } from "@defs/UIOptions";

export type Control = (typeof CONTROLS)[number];
export type AnyControl = Control | "spacer";
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

export interface ControlPanelConfig {
  profile: string | boolean;
  title: string | boolean;
  artist: string | boolean;
  top: AnyControl[] | false;
  center: AnyControl[] | false;
  bottom: AnyControl[] | AnyControl[][] | Partial<ControlPanelBottomTuple> | false;
  buffer: UISettings<"eclipse" | "accent" | boolean>;
  timeline: TimelineConfig & {
    thumb: UISettings<boolean | "auto">;
  };
  progressBar: boolean;
  draggable: ControlPanelDraggable;
}
