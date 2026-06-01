export interface FastPlay {
  playbackRate: number;
  key: boolean;
  pointer: {
    type: string;
    threshold: number;
    inset: number;
  };
  reset: boolean;
  rewind: boolean;
}

export interface FastPlayState {
  isRewinding: boolean;
}
