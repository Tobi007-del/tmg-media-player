export interface CSSMap {
  [key: string]: string | number;
}

export type Css = CSSMap & {
  syncWithMedia: Record<string, boolean>; // not a live synced key
};
