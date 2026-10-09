export const enterPip = `<svg class="tmg-media-enter-picture-in-picture-icon" viewBox="0 0 25 25">
  <path fill-rule="nonzero" d="M 21 3 A 1 1 0 0 1 22 4 V 11 H 20 V 5 H 4 V 19 H 10 V 21 H 3 A 1 1 0 0 1 2 20 V 4 A 1 1 0 0 1 3 3 H 21 Z M 21 13 A 1 1 0 0 1 22 14 V 20 A 1 1 0 0 1 21 21 H 13 A 1 1 0 0 1 12 20 V 14 A 1 1 0 0 1 13 13 H 21 Z M 6.707 6.293 L 8.957 8.543 L 11 6.5 L 11 12 L 5.5 12 L 7.543 9.957 L 5.293 7.707 L 6.707 6.293 Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    enterPip: typeof enterPip;
  }
}
