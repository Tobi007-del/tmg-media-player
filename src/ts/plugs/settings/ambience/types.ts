export interface AmbienceConfig {
  opacity: number;
  refresh: {
    interval: number;
    smoothness: number;
  };
}

export interface AmbienceState {
  snubbingAmbienceIntent: boolean;
}
