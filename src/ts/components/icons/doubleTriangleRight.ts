export const doubleTriangleRight = `<svg viewBox="0 0 30 24"><path d="M4,5V19L15,12Z" /><path d="M15,5V19L26,12Z" /></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    doubleTriangleRight: typeof doubleTriangleRight;
  }
}
