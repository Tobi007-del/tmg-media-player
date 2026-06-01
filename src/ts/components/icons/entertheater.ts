export const entertheater = `<svg class="tmg-media-enter-theater-icon" viewBox="0 0 25 25">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M23 7C23 5.34315 21.6569 4 20 4H4C2.34315 4 1 5.34315 1 7V17C1 18.6569 2.34315 20 4 20H20C21.6569 20 23 18.6569 23 17V7ZM21 7C21 6.44772 20.5523 6 20 6H4C3.44772 6 3 6.44771 3 7V17C3 17.5523 3.44772 18 4 18H20C20.5523 18 21 17.5523 21 17V7Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    entertheater: typeof entertheater;
  }
}
