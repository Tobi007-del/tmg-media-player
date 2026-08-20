export const triangleLeft = `<svg viewBox="0 0 25 25" class="tmg-media-triangle-left-icon">
  <path d="M17,5.14V19.14L6,12.14L17,5.14Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    triangleLeft: typeof triangleLeft;
  }
}
