export const doubleTriangleLeft = `<svg viewBox="0 0 30 24"><path d="M26,5V19L15,12Z" /><path d="M15,5V19L4,12Z" /></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    doubleTriangleLeft: typeof doubleTriangleLeft;
  }
}
