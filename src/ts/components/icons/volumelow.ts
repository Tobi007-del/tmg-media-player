export const volumeLow = `<svg class="tmg-media-volume-low-icon" viewBox="0 0 25 25">
  <path d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    volumeLow: typeof volumeLow;
  }
}
