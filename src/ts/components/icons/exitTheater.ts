export const exitTheater = `<svg class="tmg-media-leave-theater-icon" viewBox="0 0 25 25">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M21 8C21 6.89544 20.10456 6 19 6H5C3.89544 6 3 6.89544 3 8V16C3 17.10456 3.89544 18 5 18H19C20.10456 18 21 17.10456 21 16V8ZM19 8C19 8 19 8 19 8H5C5 8 5 8 5 8V16C5 16 5 16 5 16H19C19 16 19 16 19 16V8Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    exitTheater: typeof exitTheater;
  }
}
