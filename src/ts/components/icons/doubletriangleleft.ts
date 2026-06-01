export const doubletriangleleft = `<svg viewBox="0 0 30 24" class="tmg-media-double-triangle-left-icon">
  <path d="M22,5.14V19.14L11,12.14L22,5.14Z" />
  <path d="M11,5.14V19.14L0,12.14L11,5.14Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    doubletriangleleft: typeof doubletriangleleft;
  }
}
