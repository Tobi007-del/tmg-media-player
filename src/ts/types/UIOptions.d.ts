export type UIOption<T> =
  | T
  | {
      value: T;
      display: string;
    };

export interface UISettings<T> {
  value: T;
  options: UIOption<T>[];
  [key: string]: any;
}

export interface UIConfig<T> {
  values: T[];
  displays: string[];
}

export type UIObject<T> = {
  [K in keyof T as T[K] extends object ? K : never]: T[K] extends UISettings<infer U>
    ? UIConfig<U>
    : UIObject<T[K]>;
};
