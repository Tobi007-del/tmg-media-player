export const volumeLow = `<svg class="tmg-media-volume-low-icon" viewBox="0 0 25 25">
  <path d="M 14 7.97 L 14 7.97 C 15.5 8.71 16.5 10.23 16.5 12 C 16.5 13.76 15.5 15.29 14 16 L 14 16 C 15.5 15.29 16.5 13.76 16.5 12 C 16.5 10.23 15.5 8.71 14 7.97 Z M 16.5 12 C 16.5 10.23 15.5 8.71 14 7.97 L 14 16 C 15.5 15.29 16.5 13.76 16.5 12 Z M 3 9 L 3 15 L 7 15 L 12 20 L 12 4 L 7 9 L 3 9 Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    volumeLow: typeof volumeLow;
  }
}
