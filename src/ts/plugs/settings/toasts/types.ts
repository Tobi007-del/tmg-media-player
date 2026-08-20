import { ToastOptions } from "@t007/toast";

export interface ToastsConfig extends ToastOptions {
  disabled: boolean;
}

export interface ToastReminder extends ToastOptions {
  id: string;
  message: string;
  delay: number;
  actionId?: string; // action id to run via ctlr.execute when reminder fires
  timeoutId?: number;
}

export interface ToastsState {
  reminders: ToastReminder[];
}
