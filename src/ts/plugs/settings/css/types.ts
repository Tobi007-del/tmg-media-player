export interface CSSMap {
  [key: string]: string | number;
}

export type CssConfig = CSSMap & {
  syncWithMedia: Record<string, boolean>; // not a live synced key
};
