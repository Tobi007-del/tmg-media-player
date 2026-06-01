export const next = `<svg viewBox="0 0 25 25" class="tmg-media-next-icon">
  <path d="M8,5.14V19.14L19,12.14L8,5.14Z" transform="translate(-2.5,0)" />
  <rect x="19" y="5.14" width="2.5" height="14" transform="translate(-2.5,0)" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    next: typeof next;
  }
}
