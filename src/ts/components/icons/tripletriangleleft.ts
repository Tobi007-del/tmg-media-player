export const tripletriangleleft = `<svg viewBox="0 0 36 24" class="tmg-media-triple-triangle-left-icon">
  <path d="M30,5.14V19.14L19,12.14L30,5.14Z" />
  <path d="M19,5.14V19.14L8,12.14L19,5.14Z" />
  <path d="M8,5.14V19.14L-3,12.14L8,5.14Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    tripletriangleleft: typeof tripletriangleleft;
  }
}
