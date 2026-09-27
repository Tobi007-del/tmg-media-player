import { ToastOptions } from "@t007/toast";

export interface ToastReminder extends ToastOptions {
  id: string;
  message: string;
  after: number;
  target?: number;
  actionId?: string; // run via ctlr.execute when reminder fires
}

export interface ToastsConfig extends ToastOptions {
  reminders: Record<string, ToastReminder>;
}
