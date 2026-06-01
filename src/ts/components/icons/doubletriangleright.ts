export const doubletriangleright = `<svg viewBox="0 0 30 24" class="tmg-media-double-triangle-right-icon">
  <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
  <path d="M19,5.14V19.14L30,12.14L19,5.14Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    doubletriangleright: typeof doubletriangleright;
  }
}
