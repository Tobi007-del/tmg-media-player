export const tripleTriangleLeft = `<svg viewBox="0 0 25 25"><path d="M18,5.5V19.5L7,12.5Z" /></svg><svg viewBox="0 0 25 25"><path d="M18,5.5V19.5L7,12.5Z" /></svg><svg viewBox="0 0 25 25"><path d="M18,5.5V19.5L7,12.5Z" /></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    tripleTriangleLeft: typeof tripleTriangleLeft;
  }
}
