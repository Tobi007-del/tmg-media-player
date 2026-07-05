export const play = `<svg viewBox="0 0 25 25" class="tmg-media-play-icon">
  <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    play: typeof play;
  }
}
