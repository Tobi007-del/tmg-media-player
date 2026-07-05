export interface UITuple<T = unknown> {
  value: T;
  display: string;
  infoText?: string;
  title?: string;
}

export type UIOption<T = unknown> = T | UITuple<T>;

export interface UISettings<T = unknown> {
  value: T;
  options: UIOption<T>[];
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
