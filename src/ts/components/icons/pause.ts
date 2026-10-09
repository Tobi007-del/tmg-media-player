export const pause = `<svg viewBox="0 0 24 24" class="tmg-media-pause-icon">
  <path d="M 4.5 21 L 9.5 21 L 9.5 3 L 4.5 3 L 4.5 21 Z M 14.5 21 L 19.5 21 L 19.5 3 L 14.5 3 L 14.5 21 Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    pause: typeof pause;
  }
}
