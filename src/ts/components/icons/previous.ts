export const previous = `<svg viewBox="0 0 25 25" class="tmg-media-prev-icon">
  <rect x="4" y="5.14" width="2.5" height="14" transform="translate(2.1,0)" />
  <path d="M17,5.14V19.14L6,12.14L17,5.14Z" transform="translate(2.5,0)" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    previous: typeof previous;
  }
}
