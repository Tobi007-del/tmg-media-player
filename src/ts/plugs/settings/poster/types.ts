export interface PosterConfig {
  eager: boolean;
  autoGen: {
    disabled: boolean;
    hash: string;
  };
}

export interface PosterState {
  visible: boolean;
}
