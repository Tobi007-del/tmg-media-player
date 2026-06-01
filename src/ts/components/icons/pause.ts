export const pause = `<svg viewBox="0 0 25 25" class="tmg-media-pause-icon">
  <path d="M14,19H18V5H14M6,19H10V5H6V19Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    pause: typeof pause;
  }
}
