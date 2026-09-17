export interface UITuple<T = unknown> {
  value: T;
  display: string;
  infoText?: string;
  badge?: string;
  title?: string;
  progress?: number;
  className?: string /** CSS class(es) to add to the option element */;
  style?: string /** Inline style string applied to the option label so the option previews itself */;
}

export type UIOption<T = unknown> = T | UITuple<T>;

export interface UISettings<T = unknown, O = T> {
  value: T;
  options: Array<UIOption<O>>;
  [key: string]: any;
}
