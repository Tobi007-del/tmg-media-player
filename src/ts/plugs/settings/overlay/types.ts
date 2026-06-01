export interface Overlay {
  delay: number;
  curtain: "cover" | "auto";
  behavior: "persistent" | "auto" | "strict" | "hidden";
}

export interface OverlayState {
  visible: boolean;
}
