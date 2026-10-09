export const play = `<svg viewBox="0 0 24 24" class="tmg-media-play-icon">
  <path d="M 7 21 L 14 16.5 L 14 7.5 L 7 3 L 7 21 Z M 14 16.5 L 21 12 L 21 12 L 14 7.5 L 14 16.5 Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    play: typeof play;
  }
}
