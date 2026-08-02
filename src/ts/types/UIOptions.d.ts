export interface UITuple<T = unknown> {
  value: T;
  display: string;
  badge?: string;
  infoText?: string;
  title?: string;
  progress?: number;
  className?: string /** CSS class(es) to add to the option element */;
  style?: string /** Inline style string applied to the option label so the option previews itself */;
}

export type UIOption<T = unknown> = T | UITuple<T>;

export interface UISettings<T = unknown, O = T> {
  value: T;
  options: UIOption<O>[];
  [key: string]: any;
}

export interface UIConfig<T = unknown> {
  values: T[];
  displays: string[];
}

export type UIObject<T = unknown> = {
  [K in keyof T as T[K] extends object ? K : never]: T[K] extends UISettings<infer U>
    ? UIConfig<U>
    : UIObject<T[K]>;
};
