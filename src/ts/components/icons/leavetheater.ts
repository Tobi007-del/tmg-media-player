export const leavetheater = `<svg class="tmg-media-leave-theater-icon" viewBox="0 0 25 25">
  <path d="M19 6H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H5V8h14v8z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    leavetheater: typeof leavetheater;
  }
}
